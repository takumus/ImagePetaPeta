import { app, ipcMain, dialog, IpcMainInvokeEvent, shell } from "electron";
import * as path from "path";
import * as asyncFile from "@/utils/asyncFile";
import axios from "axios";
import sharp from "sharp";
import crypto from "crypto";
import dataURIToBuffer from "data-uri-to-buffer";
import { DEFAULT_BOARD_NAME, PACKAGE_JSON_URL } from "@/defines";
import { initWindow } from "@/window";
import { imageFormatToExtention } from "@/utils/imageFormatToExtention";
import { PetaImage, PetaImages } from "@/datas/petaImage";
import { addPetaBoardProperties, PetaBoard, createPetaBoard } from "@/datas/petaBoard";
import { ImportImageResult } from "@/datas/importImageResult";
import { UpdateMode } from "@/datas/updateMode";
import { Renderer } from "@/api/renderer";
import { MainFunctions } from "@/api/main";
import { LogFrom } from "@/datas/logFrom";
import { AddImageResult } from "@/datas/addImageResult";
import DB from "@/utils/db";
import Logger from "@/utils/logger";
import { Settings } from "@/datas/settings";
import { defaultSettings } from "@/datas/settings";
import Config from "@/utils/config";
import { addPetaPanelProperties } from "./datas/petaPanel";
(async () => {
  const window = await initWindow();
  const DIR_ROOT = path.resolve(app.getPath("pictures"), "imagePetaPeta");
  const DIR_IMAGES = path.resolve(DIR_ROOT, "images");
  const DIR_THUMBNAILS = path.resolve(DIR_ROOT, "thumbnails");
  await asyncFile.mkdir(DIR_ROOT).catch((err) => {
    //
  });
  await asyncFile.mkdir(DIR_IMAGES).catch((err) => {
    //
  });
  await asyncFile.mkdir(DIR_THUMBNAILS).catch((err) => {
    //
  });
  const logger = new Logger(path.resolve(DIR_ROOT, "logs.log"));
  const petaImagesDB = new DB<PetaImage>(path.resolve(DIR_ROOT, "images.db"));
  const boardsDB = new DB<PetaBoard>(path.resolve(DIR_ROOT, "boards.db"));
  const settingsConfig = new Config<Settings>(path.resolve(DIR_ROOT, "settings.json"), defaultSettings);
  logger.mainLog("#Load Settings");
  settingsConfig.load().then(() => {
    logger.mainLog("settings loaded");
  }).catch((e) => {
    logger.mainLog("settings load error:", e);
    settingsConfig.data = defaultSettings;
    settingsConfig.save().then(() => {
      logger.mainLog("recreate settings");
    }).catch((e) => {
      logger.mainLog("cannot recreate settings");
    })
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
      try {
        logger.mainLog("#Import Images From File Paths");
        const images = (await importImages(filePaths)).map((image) => image.id);
        logger.mainLog("return:", true);
        return images;
      } catch(e) {
        logger.mainLog("error:", e);
      }
      return [];
    },
    getPetaImages: async (event) => {
      try {
        logger.mainLog("#Get Peta Images");
        const data = await petaImagesDB.find({});
        const petaImages: PetaImages = {};
        data.forEach((pi) => {
          petaImages[pi.id] = pi;
        });
        logger.mainLog("return:", data.length);
        return petaImages;
      } catch(e) {
        logger.mainLog("error:", e);
      }
      return {};
    },
    getPetaImageBinary: async (event, data, thumbnail) => {
      try {
        logger.mainLog("#Get Peta Image Binary");
        logger.mainLog("id:", minimId(data.id));
        const buffer = await asyncFile.readFile(getImagePath(data, thumbnail));
        logger.mainLog("return:", buffer.byteLength + "bytes", minimId(data.id));
        return buffer;
      } catch(e) {
        logger.mainLog("error:", e);
      }
      return null;
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
    getPetaBoards: async (event) => {
      try {
        logger.mainLog("#Get PetaBoards");
        const data = await boardsDB.find({});
        data.forEach((board) => {
          // バージョンアップ時のプロパティ更新
          addPetaBoardProperties(board);
          board.petaPanels.forEach((petaPanel) => {
            addPetaPanelProperties(petaPanel);
          })
        })
        if (data.length == 0) {
          logger.mainLog("no boards");
          const board = createPetaBoard(DEFAULT_BOARD_NAME, 0, settingsConfig.data.darkMode);
          await updatePetaBoard(board, UpdateMode.INSERT);
          data.push(board);
          logger.mainLog("return:", data.length);
          return data;
        } else {
          logger.mainLog("return:", data.length);
          return data;
        }
      } catch(e) {
        logger.mainLog("error:", e);
      }
      return [];
    },
    updatePetaBoards: async (event, boards, mode) => {
      try {
        logger.mainLog("#Update PetaBoards");
        for (let i = 0; i < boards.length; i ++) {
          await updatePetaBoard(boards[i], mode);
        }
        logger.mainLog("return:", true);
        return true;
      } catch(e) {
        logger.mainLog("error:", e);
      }
      return false;
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
      try {
        logger.mainLog("#Check Update");
        logger.mainLog("url:", PACKAGE_JSON_URL);
        logger.mainLog("currentVersion:", app.getVersion());
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
        current: "0.0.0",
        latest: "0.0.0"
      };
    },
    updateSettings: async (event, settings) => {
      try {
        logger.mainLog("#Update Settings");
        settingsConfig.data = settings;
        await settingsConfig.save();
        logger.mainLog("return:", settingsConfig.data);
        return true;
      } catch(e) {
        logger.mainLog(e);
      }
      return false;
    },
    getSettings: async (event) => {
      try {
        logger.mainLog("#Get Settings");
        logger.mainLog("return:", settingsConfig.data);
        return settingsConfig.data;
      } catch(e) {
        logger.mainLog(e);
      }
      return defaultSettings;
    },
    getWindowIsFocused: async (event) => {
      return window.isFocused();
    },
    setZoomLevel: async (event, level) => {
      window.webContents.setZoomLevel(level);
    },
    windowMinimize: async (event) => {
      window.minimize();
    },
    windowMaximize: async (event) => {
      if (window.isMaximized()) {
        window.unmaximize();
        return;
      }
      window.maximize();
    },
    windowClose: async (event) => {
      app.quit();
    }
  }
  Object.keys(mainFunctions).forEach((key) => {
    ipcMain.handle(key, (e: IpcMainInvokeEvent, ...args) => (mainFunctions as any)[key](e, ...args));
  });
  window.addListener("blur", () => {
    sendToRenderer("windowFocused", false);
  });
  window.addListener("focus", () => {
    sendToRenderer("windowFocused", true);
  });
  async function updatePetaImage(petaImage: PetaImage, mode: UpdateMode) {
    logger.mainLog(" ##Update Peta Image");
    logger.mainLog(" mode:", mode);
    logger.mainLog(" image:", minimId(petaImage.id));
    petaImage._selected = false;
    petaImage.tags = Array.from(new Set(petaImage.tags));
    if (mode == UpdateMode.REMOVE) {
      await petaImagesDB.remove({ id: petaImage.id });
      await asyncFile.rm(getImagePath(petaImage));
      await asyncFile.rm(getImagePath(petaImage, true));
      logger.mainLog(" removed");
      return true;
    }
    await petaImagesDB.update({ id: petaImage.id }, petaImage, mode == UpdateMode.INSERT);
    logger.mainLog(" updated");
    sendToRenderer("updatePetaImage", petaImage);
    return true;
  }
  async function updatePetaBoard(board: PetaBoard, mode: UpdateMode) {
    logger.mainLog(" ##Update PetaBoard");
    logger.mainLog(" mode:", mode);
    logger.mainLog(" board:", minimId(board.id));
    if (mode == UpdateMode.REMOVE) {
      await boardsDB.remove({ id: board.id });
      logger.mainLog(" removed");
      return true;
    }
    await boardsDB.update({ id: board.id }, board, mode == UpdateMode.INSERT);
    logger.mainLog(" updated");
    return true;
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
  async function getPetaImage(id: string) {
    return (await petaImagesDB.find({ id }))[0];
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
    await petaImagesDB.update({ id: petaImage.id }, petaImage, true);
    return {
      petaImage: petaImage,
      exists: false
    };
  }
  function minimId(id: string) {
    return id.substr(0, 6);
  }
})();