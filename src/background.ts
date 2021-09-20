import { app, ipcMain, dialog, IpcMainInvokeEvent, Menu } from "electron";
import { initWindow } from "@/window";
import * as path from "path";
import * as fs from "fs";
import Nedb from "nedb";
import { Board, BoardDB, boardToBoardDB, Categories, Category, createBoard, ImportImageResult, PetaImage, PetaImages, UpdateMode } from "@/datas";
import { Renderer } from "@/api/renderer";
import { MainFunctions } from "@/api/main";
import { imageFormatToExtention } from "@/utils";
import axios from "axios";
import sharp from "sharp";
import crypto from "crypto";
import dataURIToBuffer from "data-uri-to-buffer";
import { DEFAULT_BOARD_NAME, DEFAULT_CATEGORY } from "./defines";
import { MenuItem } from "electron/main";
(async () => {
  const win = await initWindow();
  const DIR_ROOT = path.resolve(app.getPath("desktop"), "petaDatas");
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
  const categoriesDB = new Nedb<Category>({
    filename: path.resolve(DIR_ROOT, "categories.db"),
    autoload: true
  });
  const boardsDB = new Nedb<BoardDB>({
    filename: path.resolve(DIR_ROOT, "boards.db"),
    autoload: true
  });
  mainLog(DIR_ROOT);
  const mainAPIs: MainFunctions = {
    browseImages: async () => {
      const file = await dialog.showOpenDialog(win, { properties: ['openFile', 'multiSelections'] });
      if (file.canceled) {
        throw "canceled";
      }
      importImage(file.filePaths);
      return file.filePaths.length;
    },
    importImageFromURL: async (event, url) => {
      try {
        sendToRenderer("importImagesBegin", 1);
        let data: Buffer;
        if (url.trim().indexOf("http") != 0) {
          // dataURIだったら
          data = dataURIToBuffer(url);
        } else {
          // 普通のurlだったら
          data = (await axios.get(url, { responseType: 'arraybuffer' })).data;
        }
        const extName = "." + imageFormatToExtention((await sharp(data).metadata()).format);
        if (!extName) throw new Error("invalid image file");
        const now = new Date();
        const addResult = await addImage(data, now.toLocaleString(), extName, now, now);
        sendToRenderer("importImagesProgress", 1, url, addResult.exists ? ImportImageResult.EXISTS : ImportImageResult.SUCCESS);
        sendToRenderer("importImagesComplete", 1, 1);
        return addResult.petaImage.id;
      } catch (e) {
        // console.log(e);
        sendToRenderer("importImagesProgress", 1, url, ImportImageResult.ERROR);
        sendToRenderer("importImagesComplete", 1, 0);
      }
      return "";
    },
    importImagesFromFilePaths: async (event, filePaths) =>{
      return (await importImage(filePaths)).map((image) => image.id);
    },
    getPetaImages: async (event, categories, order) => {
      return new Promise((res, rej) => {
        petaImagesDB.find({}).exec((err, data) => {
          if (err) {
            rej(err.message);
            return {};
          }
          const petaImages: PetaImages = {};
          data.forEach((pi) => {
            petaImages[pi.id] = pi;
          });
          res(petaImages);
        });
      });
    },
    getPetaImageBinary: async (event, data, thumbnail) => {
      return new Promise((res, rej) => {
        fs.readFile(getImagePath(data, thumbnail), (err, buffer) => {
          if (err) {
            rej(err.message);
            return;
          }
          res(buffer);
        });
      });
    },
    updatePetaImages: async (event, datas, mode) => {
      try {
        for (let i = 0; i < datas.length; i ++) {
          await updatePetaImage(datas[i], mode);
        }
      } catch (err) {
        //
      }
      if (mode != UpdateMode.UPDATE) {
        sendToRenderer("updatePetaImages");
      }
      return true;
    },
    getCategories: async (event) => {
      return new Promise((res, rej) => {
        categoriesDB.find({}).exec((err, data) => {
          if (err) {
            rej(err.message);
            return;
          }
          const categories: Categories = {};
          data.forEach((c) => {
            categories[c.id] = c;
          })
          res(categories);
        });
      });
    },
    updateCategories: async (event, categories, mode) => {
      try {
        for (let i = 0; i < categories.length; i ++) {
          await updateCategory(categories[i], mode);
        }
      } catch (err) {
        //
      }
      if (mode != UpdateMode.UPDATE) {
        sendToRenderer("updateCategories");
      }
      return true;
    },
    getBoards: async (event) => {
      return new Promise((res, rej) => {
        boardsDB.find({}).exec((err, data) => {
          if (err) {
            rej(err.message);
            return;
          }
          if (data.length == 0) {
            const board = createBoard(DEFAULT_BOARD_NAME);
            updateBoard(board, UpdateMode.INSERT)
            .then(() => {
              data.push(boardToBoardDB(board));
              res(data);
            });
          } else {
            res(data);
          }
        });
      });
    },
    updateBoards: async (event, boards, mode) => {
      try {
        for (let i = 0; i < boards.length; i ++) {
          await updateBoard(boards[i], mode);
        }
      } catch (err) {
        return false;
      }
      return true;
    },
    log: async (event, ...args: any) => {
      log(LogFrom.RENDERER, ...args);
      return true;
    },
    dialog: async (event, message, buttons) => {
      const value = await dialog.showMessageBox(win, {
        title: "Petapeta",
        message: message,
        buttons: buttons
      });
      return value.response;
    }
  }
  function updatePetaImage(petaImage: PetaImage, mode: UpdateMode): Promise<boolean> {
    petaImage._selected = false;
    return new Promise((res, rej) => {
      if (mode == UpdateMode.REMOVE) {
        petaImagesDB.remove({ id: petaImage.id }, {}, (err) => {
          if (err) {
            rej(err.message);
          } else {
            fs.rm(getImagePath(petaImage), () => {
              fs.rm(getImagePath(petaImage, true), () => {
                res(true);
              });
            });
          }
        });
      } else {
        if (petaImage.addDate)
        petaImagesDB.update({ id: petaImage.id }, petaImage, { upsert: mode == UpdateMode.INSERT }, (err) => {
          if (err) {
            rej(err.message);
          } else {
            res(true);
            sendToRenderer("updatePetaImage", petaImage);
          }
        });
      }
    })
  }
  function updateCategory(category: Category, mode: UpdateMode): Promise<boolean> {
    return new Promise((res, rej) => {
      if (mode == UpdateMode.REMOVE) {
        categoriesDB.remove({ id: category.id }, {}, (err) => {
          if (err) {
            rej(err.message);
          } else {
            res(true);
          }
        });
      } else {
        categoriesDB.update({ id: category.id }, category, { upsert: mode == UpdateMode.INSERT }, (err) => {
          if (err) {
            rej(err.message);
          } else {
            res(true);
          }
        });
      }
    });
  }
  function updateBoard(board: Board, mode: UpdateMode): Promise<boolean> {
    return new Promise((res, rej) => {
      if (mode == UpdateMode.REMOVE) {
        boardsDB.remove({ id: board.id }, {}, (err) => {
          if (err) {
            rej(err.message);
          } else {
            res(true);
          }
        });
      } else {
        const dbBoard: BoardDB = boardToBoardDB(board);
        boardsDB.update({ id: board.id }, dbBoard, { upsert: mode == UpdateMode.INSERT }, (err) => {
          if (err) {
            rej(err.message);
          } else {
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
  async function importImage(filePaths: string[]) {
    sendToRenderer("importImagesBegin", filePaths.length);
    let addedFileCount = 0;
    const petaImages: PetaImage[] = [];
    const addDate = new Date();
    for (let i = 0; i < filePaths.length; i++) {
      const filePath = filePaths[i];
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
      } catch (err) {
        result = ImportImageResult.ERROR;
      }
      sendToRenderer("importImagesProgress", (i + 1) / filePaths.length, filePath, result);
    }
    sendToRenderer("importImagesComplete", filePaths.length, addedFileCount);
    return petaImages;
  }
  async function getPetaImage(id: string) {
    return new Promise((res: (data?: PetaImage) => void, rej: () => void) => {
      petaImagesDB.findOne({id}, (err, doc) => {
        if (err) {
          res(undefined);
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
  async function saveFile(buffer: Buffer, filePath: string) {
    return new Promise((res: (v: string) => void, rej: (v: string) => void) => {
      fs.writeFile(filePath, buffer, (err) => {
        if (err) {
          rej(err.message);
          return;
        }
        res("ok");
      });
    });
  }
  async function readFile(path: string) {
    return new Promise((res: (v: Buffer) => void, rej: (v: string) => void) => {
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
function log(from: LogFrom, ...args: any[]) {
  console.log(`[${from}]`, ...args);
}
function mainLog(...args: any[]) {
  log(LogFrom.MAIN, ...args);
}
enum LogFrom {
  MAIN = "main",
  RENDERER = "renderer"
}
interface AddImageResult {
  exists: boolean,
  petaImage: PetaImage
}