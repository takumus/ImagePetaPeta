import { app, ipcMain, dialog, IpcMainInvokeEvent, shell } from "electron";
import * as path from "path";
import * as fs from "fs";
import * as asyncFile from "@/utils/asyncFile";
import Nedb from "nedb";
import axios from "axios";
import sharp from "sharp";
import crypto from "crypto";
import dataURIToBuffer from "data-uri-to-buffer";
import { DEFAULT_BOARD_NAME, PACKAGE_JSON_URL } from "@/defines";
import { initWindow } from "@/window";
import { imageFormatToExtention } from "@/utils/imageFormatToExtention";
import { PetaImage, PetaImages } from "@/datas/petaImage";
import { Board, createBoard } from "@/datas/board";
import { ImportImageResult } from "@/datas/importImageResult";
import { UpdateMode } from "@/datas/updateMode";
import { Renderer } from "@/api/renderer";
import { MainFunctions } from "@/api/main";
import { LogFrom } from "./datas/logFrom";
import { AddImageResult } from "./datas/addImageResult";
import Logger from "@/utils/logger";
(async () => {
  const window = await initWindow();
  const DIR_ROOT = path.resolve(app.getPath("pictures"), "imagePetaPeta");
  const DIR_IMAGES = path.resolve(DIR_ROOT, "images");
  const DIR_THUMBNAILS = path.resolve(DIR_ROOT, "thumbnails");
  const logger = new Logger(path.resolve(DIR_ROOT, "logs.log"));
  await asyncFile.mkdir(DIR_ROOT).catch((err) => {
    //
  });
  await asyncFile.mkdir(DIR_IMAGES).catch((err) => {
    //
  });
  await asyncFile.mkdir(DIR_THUMBNAILS).catch((err) => {
    //
  });
  const petaImagesDB = new Nedb<PetaImage>({
    filename: path.resolve(DIR_ROOT, "images.db"),
    autoload: true
  });
  const boardsDB = new Nedb<Board>({
    filename: path.resolve(DIR_ROOT, "boards.db"),
    autoload: true
  });
  const mainFunctions: MainFunctions = {
    browseImages: async () => {
      logger.mainLog("#Browse Images");
      const file = await dialog.showOpenDialog(window, { properties: ['openFile', 'multiSelections'] });
      if (file.canceled) {
        logger.mainLog("canceled");
        return 0;
      }
      logger.mainLog("return:", file.filePaths.length);
      importImages(file.filePaths);
      return file.filePaths.length;
    },
    importImageFromURL: async (event, url) => {
      try {
        sendToRenderer("importImagesBegin", 1);
        logger.mainLog("#Import Image From URL");
        let data: Buffer;
        if (url.trim().indexOf("http") != 0) {
          // dataURIだったら
          logger.mainLog("data uri");
          data = dataURIToBuffer(url);
        } else {
          // 普通のurlだったら
          logger.mainLog("normal url:", url);
          data = (await axios.get(url, { responseType: 'arraybuffer' })).data;
        }
        const extName = "." + imageFormatToExtention((await sharp(data).metadata()).format);
        if (!extName) {
          logger.mainLog("invalid image file");
          throw new Error("invalid image file");
        }
        const now = new Date();
        const addResult = await addImage(data, now.toLocaleString(), extName, now, now);
        sendToRenderer("importImagesProgress", 1, url, addResult.exists ? ImportImageResult.EXISTS : ImportImageResult.SUCCESS);
        sendToRenderer("importImagesComplete", 1, 1);
        logger.mainLog("return: ", minimId(addResult.petaImage.id));
        return addResult.petaImage.id;
      } catch (err) {
        logger.mainLog("error: ", err);
        sendToRenderer("importImagesProgress", 1, url, ImportImageResult.ERROR);
        sendToRenderer("importImagesComplete", 1, 0);
      }
      return "";
    },
    importImagesFromFilePaths: async (event, filePaths) =>{
      logger.mainLog("#Import Images From File Paths");
      const images = (await importImages(filePaths)).map((image) => image.id);
      logger.mainLog("return:", true);
      return images;
    },
    getPetaImages: async (event) => {
      logger.mainLog("#Get Peta Images");
      return new Promise((res, rej) => {
        petaImagesDB.find({}).exec((err, data) => {
          if (err) {
            rej(err.message);
            logger.mainLog("error:", err.message);
            return {};
          }
          const petaImages: PetaImages = {};
          data.forEach((pi) => {
            petaImages[pi.id] = pi;
          });
          logger.mainLog("return:", data.length);
          res(petaImages);
        });
      });
    },
    getPetaImageBinary: async (event, data, thumbnail) => {
      logger.mainLog("#Get Peta Image Binary");
      logger.mainLog("id:", minimId(data.id));
      return new Promise((res, rej) => {
        const buffer = asyncFile.readFile(getImagePath(data, thumbnail))
        .then((buffer) => {
          logger.mainLog("return:", buffer.byteLength + "bytes", minimId(data.id));
          res(buffer);
        })
        .catch((err) => {
          if (err) {
            logger.mainLog("error:", err, minimId(data.id));
            rej(err.message);
            return;
          }
        });
      });
    },
    updatePetaImages: async (event, datas, mode) => {
      logger.mainLog("#Update Peta Images");
      try {
        for (let i = 0; i < datas.length; i ++) {
          await updatePetaImage(datas[i], mode);
        }
      } catch (err) {
        logger.mainLog("error:", err);
      }
      if (mode != UpdateMode.UPDATE) {
        sendToRenderer("updatePetaImages");
      }
      logger.mainLog("return:", true);
      return true;
    },
    getBoards: async (event) => {
      logger.mainLog("#Get Boards");
      return new Promise((res, rej) => {
        boardsDB.find({}).exec(async (err, data) => {
          if (err) {
            logger.mainLog("error:", err.message);
            rej(err.message);
            return;
          }
          if (data.length == 0) {
            logger.mainLog("no boards");
            const board = createBoard(DEFAULT_BOARD_NAME);
            try {
              await updateBoard(board, UpdateMode.INSERT);
            } catch(err) {
              logger.mainLog("error:", err);
              rej(err);
            }
            data.push(board);
            logger.mainLog("return:", data.length);
            res(data);
          } else {
            logger.mainLog("return:", data.length);
            res(data);
          }
        });
      });
    },
    updateBoards: async (event, boards, mode) => {
      logger.mainLog("#Update Boards");
      try {
        for (let i = 0; i < boards.length; i ++) {
          await updateBoard(boards[i], mode);
        }
      } catch (err) {
        logger.mainLog("error:", err);
        return false;
      }
      logger.mainLog("return:", true);
      return true;
    },
    log: async (event, ...args: any) => {
      logger.log(LogFrom.RENDERER, ...args);
      return true;
    },
    dialog: async (event, message, buttons) => {
      logger.mainLog("#Dialog");
      logger.mainLog("dialog:", message, buttons);
      const value = await dialog.showMessageBox(window, {
        title: "Petapeta",
        message: message,
        buttons: buttons
      });
      return value.response;
    },
    openURL: async (event, url) => {
      logger.mainLog("#Open URL");
      logger.mainLog("url:", url);
      shell.openExternal(url);
      return true;
    },
    getAppInfo: async (event) => {
      logger.mainLog("#Get App Info");
      const info = {
        name: app.getName(),
        version: app.getVersion()
      };
      logger.mainLog("return:", info);
      return info;
    },
    showDBFolder: async (event) => {
      logger.mainLog("#Show DB Folder");
      shell.showItemInFolder(DIR_ROOT);
      return true;
    },
    showImageInFolder: async (event, petaImage) => {
      logger.mainLog("#Show Image In Folder");
      shell.showItemInFolder(getImagePath(petaImage, false));
      return true;
    },
    checkUpdate: async (event) => {
      logger.mainLog("#Check Update");
      logger.mainLog("url:", PACKAGE_JSON_URL);
      logger.mainLog("currentVersion:", app.getVersion());
      try {
        const packageJSON = (await axios.get(PACKAGE_JSON_URL, { responseType: "json" })).data;
        logger.mainLog("latestVersion:", packageJSON.version);
        return {
          current: app.getVersion(),
          latest: packageJSON.version
        }
      } catch(e) {
        logger.mainLog("error:", e);
      }
      return {
        current: app.getVersion(),
        latest: "0.0.0"
      }
    }
  }
  Object.keys(mainFunctions).forEach((key) => {
    ipcMain.handle(key, (e: IpcMainInvokeEvent, ...args) => (mainFunctions as any)[key](e, ...args));
  });
  function updatePetaImage(petaImage: PetaImage, mode: UpdateMode): Promise<boolean> {
    logger.mainLog(" ##Update Peta Image");
    logger.mainLog(" mode:", mode);
    logger.mainLog(" image:", minimId(petaImage.id));
    petaImage._selected = false;
    petaImage.tags = Array.from(new Set(petaImage.tags));
    return new Promise((res, rej) => {
      if (mode == UpdateMode.REMOVE) {
        petaImagesDB.remove({ id: petaImage.id }, {}, (err) => {
          if (err) {
            logger.mainLog(" failed to remove", err.message);
            rej(err.message);
          } else {
            asyncFile.rm(getImagePath(petaImage)).then(() => {
              logger.mainLog(" removed fullsize");
            }).catch((err) => {
              logger.mainLog(" failed to removed fullsize");
            });
            asyncFile.rm(getImagePath(petaImage, true)).then(() => {
              logger.mainLog(" removed thumbnail");
            }).catch((err) => {
              logger.mainLog(" failed to removed thumbnail");
            });
          }
        });
      } else {
        if (petaImage.addDate)
        petaImagesDB.update({ id: petaImage.id }, petaImage, { upsert: mode == UpdateMode.INSERT }, (err) => {
          if (err) {
            logger.mainLog(" failed to update:", err.message);
            rej(err.message);
          } else {
            logger.mainLog(" updated");
            res(true);
            sendToRenderer("updatePetaImage", petaImage);
          }
        });
      }
    })
  }
  function updateBoard(board: Board, mode: UpdateMode): Promise<boolean> {
    logger.mainLog(" ##Update Board");
    logger.mainLog(" mode:", mode);
    logger.mainLog(" board:", minimId(board.id));
    return new Promise((res, rej) => {
      if (mode == UpdateMode.REMOVE) {
        boardsDB.remove({ id: board.id }, {}, (err) => {
          if (err) {
            logger.mainLog(" failed to remove", err.message);
            rej(err.message);
          } else {
            logger.mainLog(" removed");
            res(true);
          }
        });
      } else {
        boardsDB.update({ id: board.id }, board, { upsert: mode == UpdateMode.INSERT }, (err) => {
          if (err) {
            logger.mainLog(" failed to update:", err.message);
            rej(err.message);
          } else {
            logger.mainLog(" updated");
            res(true);
          }
        });
      }
    });
  }
  function getImagePathFromFilename(fileName: string, thumbnail = false) {
    return path.resolve(thumbnail ? DIR_THUMBNAILS : DIR_IMAGES, fileName + (thumbnail ? ".webp" : ""));
  }
  function getImagePath(petaImage: PetaImage, thumbnail = false) {
    return getImagePathFromFilename(petaImage.fileName, thumbnail);
  }
  function sendToRenderer<U extends keyof Renderer>(key: U, ...args: Parameters<Renderer[U]>): void {
    window.webContents.send(key, ...args);
  }
  async function importImages(filePaths: string[]) {
    sendToRenderer("importImagesBegin", filePaths.length);
    logger.mainLog(" ##Import Images");
    logger.mainLog(" files:", filePaths.length);
    let addedFileCount = 0;
    const petaImages: PetaImage[] = [];
    const addDate = new Date();
    for (let i = 0; i < filePaths.length; i++) {
      const filePath = filePaths[i];
      logger.mainLog(" import:", i + 1, "/", filePaths.length);
      let result = ImportImageResult.SUCCESS;
      try {
        const data = await asyncFile.readFile(filePath);
        const name = path.basename(filePath);
        const extName = path.extname(filePath);
        const fileDate = (await asyncFile.stat(filePath)).mtime;
        const addResult = await addImage(data, name, extName, fileDate, addDate);
        petaImages.push(addResult.petaImage);
        if (addResult.exists) {
          result = ImportImageResult.EXISTS;
        }
        // success
        addedFileCount++;
        logger.mainLog(" imported", name, result);
      } catch (err) {
        logger.mainLog(" error:", err);
        result = ImportImageResult.ERROR;
      }
      sendToRenderer("importImagesProgress", (i + 1) / filePaths.length, filePath, result);
    }
    logger.mainLog(" return:", addedFileCount, "/", filePaths.length);
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
      tags: [],
      _selected: false
    }
    await asyncFile.writeFile(getImagePathFromFilename(fileName, false), data);
    petaImagesDB.update({ id: petaImage.id }, petaImage, { upsert: true });
    return {
      petaImage: petaImage,
      exists: false
    };
  }
  function minimId(id: string) {
    return id.substr(0, 6);
  }
})();