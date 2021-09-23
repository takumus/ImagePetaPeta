import { app, ipcMain, dialog, IpcMainInvokeEvent, Menu } from "electron";
import { initWindow } from "@/window";
import * as path from "path";
import * as fs from "fs";
import Nedb from "nedb";
import { Board, createBoard, ImportImageResult, PetaImage, PetaImages, UpdateMode } from "@/datas";
import { Renderer } from "@/api/renderer";
import { MainFunctions } from "@/api/main";
import { imageFormatToExtention } from "@/utils";
import axios from "axios";
import sharp from "sharp";
import crypto from "crypto";
import dataURIToBuffer from "data-uri-to-buffer";
import { DEFAULT_BOARD_NAME } from "./defines";
(async () => {
  const win = await initWindow();
  const DIR_ROOT = path.resolve(app.getPath("pictures"), "petaDatas");
  const DIR_IMAGES = path.resolve(DIR_ROOT, "images");
  const DIR_THUMBNAILS = path.resolve(DIR_ROOT, "thumbnails");
  // fs.rmdirSync(DIR_ROOT, {
  //   recursive: true
  // })
  if (!fs.existsSync(DIR_ROOT)) {
    fs.mkdirSync(DIR_ROOT);
  }
  if (!fs.existsSync(DIR_IMAGES)) {
    fs.mkdirSync(DIR_IMAGES);
  }
  if (!fs.existsSync(DIR_THUMBNAILS)) {
    fs.mkdirSync(DIR_THUMBNAILS);
  }
  const petaImagesDB = new Nedb<PetaImage>({
    filename: path.resolve(DIR_ROOT, "images.db"),
    autoload: true
  });
  const boardsDB = new Nedb<Board>({
    filename: path.resolve(DIR_ROOT, "boards.db"),
    autoload: true
  });
  mainLog(DIR_ROOT);
  const mainAPIs: MainFunctions = {
    browseImages: async () => {
      mainLog("#Browse Images");
      const file = await dialog.showOpenDialog(win, { properties: ['openFile', 'multiSelections'] });
      if (file.canceled) {
        mainLog("canceled");
        return 0;
      }
      mainLog("return:", file.filePaths.length);
      importImages(file.filePaths);
      return file.filePaths.length;
    },
    importImageFromURL: async (event, url) => {
      try {
        sendToRenderer("importImagesBegin", 1);
        mainLog("#Import Image From URL");
        let data: Buffer;
        if (url.trim().indexOf("http") != 0) {
          // dataURIだったら
          mainLog("data uri");
          data = dataURIToBuffer(url);
        } else {
          // 普通のurlだったら
          mainLog("normal url:", url);
          data = (await axios.get(url, { responseType: 'arraybuffer' })).data;
        }
        const extName = "." + imageFormatToExtention((await sharp(data).metadata()).format);
        if (!extName) {
          mainLog("invalid image file");
          throw new Error("invalid image file");
        }
        const now = new Date();
        const addResult = await addImage(data, now.toLocaleString(), extName, now, now);
        sendToRenderer("importImagesProgress", 1, url, addResult.exists ? ImportImageResult.EXISTS : ImportImageResult.SUCCESS);
        sendToRenderer("importImagesComplete", 1, 1);
        mainLog("return: ", minimId(addResult.petaImage.id));
        return addResult.petaImage.id;
      } catch (err) {
        mainLog("error: ", err);
        sendToRenderer("importImagesProgress", 1, url, ImportImageResult.ERROR);
        sendToRenderer("importImagesComplete", 1, 0);
      }
      return "";
    },
    importImagesFromFilePaths: async (event, filePaths) =>{
      mainLog("#Import Images From File Paths");
      const images = (await importImages(filePaths)).map((image) => image.id);
      mainLog("return:", true);
      return images;
    },
    getPetaImages: async (event) => {
      mainLog("#Get Peta Images");
      return new Promise((res, rej) => {
        petaImagesDB.find({}).exec((err, data) => {
          if (err) {
            rej(err.message);
            mainLog("error:", err.message);
            return {};
          }
          const petaImages: PetaImages = {};
          data.forEach((pi) => {
            petaImages[pi.id] = pi;
          });
          mainLog("return:", data.length);
          res(petaImages);
        });
      });
    },
    getPetaImageBinary: async (event, data, thumbnail) => {
      mainLog("#Get Peta Image Binary");
      mainLog("id:", minimId(data.id));
      return new Promise((res, rej) => {
        fs.readFile(getImagePath(data, thumbnail), (err, buffer) => {
          if (err) {
            mainLog("error:", err, minimId(data.id));
            rej(err.message);
            return;
          }
          mainLog("return:", buffer.byteLength + "bytes", minimId(data.id));
          res(buffer);
        });
      });
    },
    updatePetaImages: async (event, datas, mode) => {
      mainLog("#Update Peta Images");
      try {
        for (let i = 0; i < datas.length; i ++) {
          await updatePetaImage(datas[i], mode);
        }
      } catch (err) {
        mainLog("error:", err);
      }
      if (mode != UpdateMode.UPDATE) {
        sendToRenderer("updatePetaImages");
      }
      mainLog("return:", true);
      return true;
    },
    getBoards: async (event) => {
      mainLog("#Get Boards");
      return new Promise((res, rej) => {
        boardsDB.find({}).exec(async (err, data) => {
          if (err) {
            mainLog("error:", err.message);
            rej(err.message);
            return;
          }
          if (data.length == 0) {
            mainLog("no boards");
            const board = createBoard(DEFAULT_BOARD_NAME);
            try {
              await updateBoard(board, UpdateMode.INSERT);
            } catch(err) {
              mainLog("error:", err);
              rej(err);
            }
            data.push(board);
            mainLog("return:", data.length);
            res(data);
          } else {
            mainLog("return:", data.length);
            res(data);
          }
        });
      });
    },
    updateBoards: async (event, boards, mode) => {
      mainLog("#Update Boards");
      try {
        for (let i = 0; i < boards.length; i ++) {
          await updateBoard(boards[i], mode);
        }
      } catch (err) {
        mainLog("error:", err);
        return false;
      }
      mainLog("return:", true);
      return true;
    },
    log: async (event, ...args: any) => {
      log(LogFrom.RENDERER, ...args);
      return true;
    },
    dialog: async (event, message, buttons) => {
      mainLog("#Dialog");
      mainLog("dialog:", message, buttons);
      const value = await dialog.showMessageBox(win, {
        title: "Petapeta",
        message: message,
        buttons: buttons
      });
      return value.response;
    }
  }
  function updatePetaImage(petaImage: PetaImage, mode: UpdateMode): Promise<boolean> {
    mainLog(" ##Update Peta Image");
    mainLog(" mode:", mode);
    mainLog(" image:", minimId(petaImage.id));
    petaImage._selected = false;
    petaImage.categories = Array.from(new Set(petaImage.categories));
    return new Promise((res, rej) => {
      if (mode == UpdateMode.REMOVE) {
        petaImagesDB.remove({ id: petaImage.id }, {}, (err) => {
          if (err) {
            mainLog(" failed to remove", err.message);
            rej(err.message);
          } else {
            fs.rm(getImagePath(petaImage), () => {
              fs.rm(getImagePath(petaImage, true), () => {
                mainLog(" removed");
                res(true);
              });
            });
          }
        });
      } else {
        if (petaImage.addDate)
        petaImagesDB.update({ id: petaImage.id }, petaImage, { upsert: mode == UpdateMode.INSERT }, (err) => {
          if (err) {
            mainLog(" failed to update:", err.message);
            rej(err.message);
          } else {
            mainLog(" updated");
            res(true);
            sendToRenderer("updatePetaImage", petaImage);
          }
        });
      }
    })
  }
  function updateBoard(board: Board, mode: UpdateMode): Promise<boolean> {
    mainLog(" ##Update Board");
    mainLog(" mode:", mode);
    mainLog(" board:", minimId(board.id));
    return new Promise((res, rej) => {
      if (mode == UpdateMode.REMOVE) {
        boardsDB.remove({ id: board.id }, {}, (err) => {
          if (err) {
            mainLog(" failed to remove", err.message);
            rej(err.message);
          } else {
            mainLog(" removed");
            res(true);
          }
        });
      } else {
        boardsDB.update({ id: board.id }, board, { upsert: mode == UpdateMode.INSERT }, (err) => {
          if (err) {
            mainLog(" failed to update:", err.message);
            rej(err.message);
          } else {
            mainLog(" updated");
            res(true);
          }
        });
      }
    });
  }
  function getImagePathFromFilename(fileName: string, thumbnail: boolean = false) {
    return path.resolve(thumbnail ? DIR_THUMBNAILS : DIR_IMAGES, fileName + (thumbnail ? ".webp" : ""));
  }
  function getImagePath(petaImage: PetaImage, thumbnail: boolean = false) {
    return getImagePathFromFilename(petaImage.fileName, thumbnail);
  }
  function sendToRenderer<U extends keyof Renderer>(key: U, ...args: Parameters<Renderer[U]>): void {
    win.webContents.send(key, ...args);
  }
  Object.keys(mainAPIs).forEach((key) => {
    ipcMain.handle(key, (e: IpcMainInvokeEvent, ...args) => (mainAPIs as any)[key](e, ...args));
  });
  async function importImages(filePaths: string[]) {
    sendToRenderer("importImagesBegin", filePaths.length);
    mainLog(" ##Import Images");
    mainLog(" files:", filePaths.length);
    let addedFileCount = 0;
    const petaImages: PetaImage[] = [];
    const addDate = new Date();
    for (let i = 0; i < filePaths.length; i++) {
      const filePath = filePaths[i];
      mainLog(" import:", i + 1, "/", filePaths.length);
      let result = ImportImageResult.SUCCESS;
      try {
        const data = await readFile(filePath);
        const name = path.basename(filePath);
        const extName = path.extname(filePath);
        const fileDate = fs.statSync(filePath).mtime;
        const addResult = await addImage(data, name, extName, fileDate, addDate);
        petaImages.push(addResult.petaImage);
        if (addResult.exists) {
          result = ImportImageResult.EXISTS;
        }
        // success
        addedFileCount++;
        mainLog(" imported", name, result);
      } catch (err) {
        mainLog(" error:", err);
        result = ImportImageResult.ERROR;
      }
      sendToRenderer("importImagesProgress", (i + 1) / filePaths.length, filePath, result);
    }
    mainLog(" return:", addedFileCount, "/", filePaths.length);
    sendToRenderer("importImagesComplete", filePaths.length, addedFileCount);
    return petaImages;
  }
  function getPetaImage(id: string): Promise<PetaImage | null> {
    return new Promise((res, rej) => {
      petaImagesDB.findOne({id}, (err, doc) => {
        if (err) {
          res(null);
          return;
        }
        res(doc);
      });
    });
  }
  async function addImage(data: Buffer, name: string, extName: string, fileDate: Date, addDate: Date): Promise<AddImageResult> {
    const id = crypto.createHash('sha256').update(data).digest('hex');
    const exists = await getPetaImage(id);
    if (exists) return {
      petaImage: exists,
      exists: true
    };
    const fileName = `${id}${extName}`;
    const output = await sharp(data)
    .resize(128)
    .webp({ quality: 80 })
    .toFile(getImagePathFromFilename(fileName, true));
    const petaImage: PetaImage = {
      fileName: fileName,
      name: name,
      fileDate: fileDate.getTime(),
      addDate: addDate.getTime(),
      width: 1,
      height: output.height / output.width,
      id: id,
      categories: [],
      _selected: false
    }
    await saveFile(data, getImagePathFromFilename(fileName, false));
    petaImagesDB.update({ id: petaImage.id }, petaImage, { upsert: true });
    return {
      petaImage: petaImage,
      exists: false
    };
  }
  function saveFile(buffer: Buffer, filePath: string): Promise<boolean> {
    return new Promise((res, rej) => {
      fs.writeFile(filePath, buffer, (err) => {
        if (err) {
          rej(err.message);
          return;
        }
        res(true);
      });
    });
  }
  function readFile(path: string): Promise<Buffer> {
    return new Promise((res, rej) => {
      fs.readFile(path, (err, data) => {
        if (err) {
          rej(err.message);
          return;
        }
        res(data);
      });
    });
  }
})();
function minimId(id: string) {
  return id.substr(0, 6);
}
function log(from: LogFrom, ...args: any[]) {
  console.log(`[${from}](${new Date().toISOString().replace('T', " ").replace(/....Z/g, "")})`, ...args);
}
function mainLog(...args: any[]) {
  log(LogFrom.MAIN, ...args);
}
enum LogFrom {
  MAIN = "MAIN",
  RENDERER = "REND"
}
interface AddImageResult {
  exists: boolean,
  petaImage: PetaImage
}