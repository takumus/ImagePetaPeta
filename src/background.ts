import { app, ipcMain, dialog, IpcMainInvokeEvent, shell, session, protocol, BrowserWindow } from "electron";
import * as path from "path";
import axios from "axios";
import sharp from "sharp";
import crypto from "crypto";
import dataURIToBuffer from "data-uri-to-buffer";
import { encode as encodePlaceholder } from "blurhash";
import { v4 as uuid } from "uuid";
import { createProtocol } from "vue-cli-plugin-electron-builder/lib";

import { DEFAULT_BOARD_NAME, PACKAGE_JSON_URL, WINDOW_DEFAULT_HEIGHT, WINDOW_DEFAULT_WIDTH, WINDOW_MIN_HEIGHT, WINDOW_MIN_WIDTH } from "@/defines";
import * as file from "@/utils/file";
import DB from "@/utils/db";
import { imageFormatToExtention } from "@/utils/imageFormatToExtention";
import Logger from "@/utils/logger";
import Config from "@/utils/config";
import { PetaImage, PetaImages } from "@/datas/petaImage";
import { addPetaBoardProperties, PetaBoard, createPetaBoard } from "@/datas/petaBoard";
import { ImportImageResult } from "@/datas/importImageResult";
import { UpdateMode } from "@/datas/updateMode";
import { LogFrom } from "@/datas/logFrom";
import { AddImageResult } from "@/datas/addImageResult";
import { Settings, defaultSettings } from "@/datas/settings";
import { addPetaPanelProperties } from "@/datas/petaPanel";
import { Renderer } from "@/api/renderer";
import { MainFunctions } from "@/api/main";
import { ImageType } from "@/datas/imageType";
import { defaultStates, States } from "@/datas/states";
import { upgradePetaImage, upgradeSettings, upgradeStates } from "@/utils/upgrader";
import { minimId } from "@/utils/utils";

if (!app.requestSingleInstanceLock()) {
  app.quit();
}

const DIR_ROOT = file.mkdirSync(path.resolve(app.getPath("pictures"), "imagePetaPeta"));
const DIR_IMAGES = file.mkdirSync(path.resolve(DIR_ROOT, "images"));
const DIR_THUMBNAILS = file.mkdirSync(path.resolve(DIR_ROOT, "thumbnails"));
const logger = new Logger(path.resolve(DIR_ROOT, "logs.log"));
const petaImagesDB = new DB<PetaImage>(path.resolve(DIR_ROOT, "images.db"));
const boardsDB = new DB<PetaBoard>(path.resolve(DIR_ROOT, "boards.db"));
const settingsConfig = new Config<Settings>(path.resolve(DIR_ROOT, "settings.json"), defaultSettings);
const statesConfig = new Config<States>(path.resolve(DIR_ROOT, "states.json"), defaultStates);
let window: BrowserWindow;
//-------------------------------------------------------------------------------------------------//
/*
  初期化
*/
//-------------------------------------------------------------------------------------------------//
upgradeSettings(settingsConfig.data);
upgradeStates(statesConfig.data);
protocol.registerSchemesAsPrivileged([{
  scheme: "app",
  privileges: {
    secure: true,
    standard: true
  }
}]);
app.on("window-all-closed", () => {
  logger.mainLog("#Electron event: window-all-closed");
  if (process.platform != "darwin") {
    app.quit();
  }
});
app.on("activate", async () => {
  logger.mainLog("#Electron event: activate");
  if (BrowserWindow.getAllWindows().length === 0) {
    initWindow();
  }
});
//-------------------------------------------------------------------------------------------------//
/*
  色々な関数
*/
//-------------------------------------------------------------------------------------------------//
async function savePetaImage(petaImage: PetaImage, mode: UpdateMode) {
  logger.mainLog("##Save PetaImage");
  logger.mainLog("mode:", mode);
  logger.mainLog("image:", minimId(petaImage.id));
  petaImage.tags = Array.from(new Set(petaImage.tags));
  if (mode == UpdateMode.REMOVE) {
    await petaImagesDB.remove({ id: petaImage.id });
    logger.mainLog("removed db");
    await file.rm(getImagePath(petaImage, ImageType.FULLSIZED)).catch((e) => {});
    logger.mainLog("removed file");
    await file.rm(getImagePath(petaImage, ImageType.THUMBNAIL)).catch((e) => {});
    logger.mainLog("removed thumbnail");
    return true;
  }
  petaImage._selected = undefined;
  await petaImagesDB.update({ id: petaImage.id }, petaImage, mode == UpdateMode.INSERT);
  logger.mainLog("updated");
  // sendToRenderer("updatePetaImage", petaImage);
  return true;
}
async function savePetaBoard(board: PetaBoard, mode: UpdateMode) {
  logger.mainLog("##Save PetaBoard");
  logger.mainLog("mode:", mode);
  logger.mainLog("board:", minimId(board.id));
  if (mode == UpdateMode.REMOVE) {
    await boardsDB.remove({ id: board.id });
    logger.mainLog("removed");
    return true;
  }
  await boardsDB.update({ id: board.id }, board, mode == UpdateMode.INSERT);
  logger.mainLog("updated");
  return true;
}
function getImagePathFromFilename(fileName: string, type: ImageType) {
  const thumbnail = type == ImageType.THUMBNAIL;
  return path.resolve(thumbnail ? DIR_THUMBNAILS : DIR_IMAGES, fileName + (thumbnail ? ".webp" : ""));
}
function getImagePath(petaImage: PetaImage, thumbnail: ImageType) {
  return getImagePathFromFilename(petaImage.fileName, thumbnail);
}
function sendToRenderer<U extends keyof Renderer>(key: U, ...args: Parameters<Renderer[U]>): void {
  window.webContents.send(key, ...args);
}
async function importImages(filePaths: string[]) {
  sendToRenderer("importImagesBegin", filePaths.length);
  logger.mainLog("##Import Images");
  logger.mainLog("files:", filePaths.length);
  let addedFileCount = 0;
  const petaImages: PetaImage[] = [];
  const addDate = new Date();
  for (let i = 0; i < filePaths.length; i++) {
    const filePath = filePaths[i];
    logger.mainLog("import:", i + 1, "/", filePaths.length);
    let result = ImportImageResult.SUCCESS;
    try {
      const data = await file.readFile(filePath);
      const name = path.basename(filePath);
      const extName = path.extname(filePath);
      const fileDate = (await file.stat(filePath)).mtime;
      const addResult = await addImage(data, name, extName, fileDate, addDate);
      petaImages.push(addResult.petaImage);
      if (addResult.exists) {
        result = ImportImageResult.EXISTS;
      }
      // success
      addedFileCount++;
      logger.mainLog("imported", name, result);
    } catch (err) {
      logger.mainLog("error:", err);
      result = ImportImageResult.ERROR;
    }
    sendToRenderer("importImagesProgress", (i + 1) / filePaths.length, filePath, result);
  }
  logger.mainLog("return:", addedFileCount, "/", filePaths.length);
  sendToRenderer("importImagesComplete", filePaths.length, addedFileCount);
  return petaImages;
}
async function getPetaImage(id: string) {
  return (await petaImagesDB.find({ id }))[0];
}
async function addImage(data: Buffer, name: string, extName: string, fileDate: Date, addDate: Date): Promise<AddImageResult> {
  const id = crypto.createHash("sha256").update(data).digest("hex");
  const exists = await getPetaImage(id);
  if (exists) return {
    petaImage: exists,
    exists: true
  };
  const fileName = `${id}${extName}`;
  const output = await generateThumbnail(
    data,
    getImagePathFromFilename(fileName, ImageType.THUMBNAIL),
    settingsConfig.data.thumbnails.size,
    settingsConfig.data.thumbnails.quality
  );
  const petaImage: PetaImage = {
    fileName: fileName,
    name: name,
    fileDate: fileDate.getTime(),
    addDate: addDate.getTime(),
    width: 1,
    height: output.sharp.height / output.sharp.width,
    placeholder: output.placeholder,
    id: id,
    tags: [],
    nsfw: false,
    _selected: false
  }
  await file.writeFile(getImagePathFromFilename(fileName, ImageType.FULLSIZED), data);
  await petaImagesDB.update({ id: petaImage.id }, petaImage, true);
  return {
    petaImage: petaImage,
    exists: false
  };
}
async function generateThumbnail(data: Buffer, fileName: string, size: number, quality: number) {
  const result = await sharp(data)
  .resize(size)
  .webp({ quality: quality })
  .toFile(fileName);
  const placeholder = await new Promise<string>((res, rej) => {
    sharp(data)
    .raw()
    .ensureAlpha()
    .resize(32, 32, { fit: "inside" })
    .toBuffer((err, buffer, { width, height }) => {
      if (err) {
        rej(err);
      }
      try {
        const d = encodePlaceholder(new Uint8ClampedArray(buffer), width, height, 4, 4);
        res(d);
      } catch(e) {
        rej(e);
      }
    });
  })
  return {
    sharp: result,
    placeholder
  };
}
async function initWindow() {
  window = new BrowserWindow({
    width: WINDOW_DEFAULT_WIDTH,
    height: WINDOW_DEFAULT_HEIGHT,
    minWidth: WINDOW_MIN_WIDTH,
    minHeight: WINDOW_MIN_HEIGHT,
    frame: false,
    titleBarStyle: "hiddenInset",
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload:path.join(__dirname, "preload.js")
    }
  });
  if (process.env.WEBPACK_DEV_SERVER_URL) {
    await window.loadURL(process.env.WEBPACK_DEV_SERVER_URL as string)
    if (!process.env.IS_TEST) {
      window.webContents.openDevTools({ mode: "detach" });
    }
  } else {
    await window.loadURL("app://./index.html");
  }
  window.setMenuBarVisibility(false);
  window.setSize(statesConfig.data.windowSize.width, statesConfig.data.windowSize.height);
  if (statesConfig.data.windowIsMaximized) {
    window.maximize();
  }
  window.on("close", () => {
    if (!window.isMaximized()) {
      statesConfig.data.windowSize.width = window.getSize()[0];
      statesConfig.data.windowSize.height = window.getSize()[1];
    }
    statesConfig.data.windowIsMaximized = window.isMaximized();
    statesConfig.save();
    logger.mainLog("#Save Window Size", statesConfig.data.windowSize);
  });
  window.addListener("blur", () => {
    sendToRenderer("windowFocused", false);
  });
  window.addListener("focus", () => {
    sendToRenderer("windowFocused", true);
  });
  window.setAlwaysOnTop(settingsConfig.data.alwaysOnTop);
  return window;
}
//-------------------------------------------------------------------------------------------------//
/*
  アプリ準備完了
*/
//-------------------------------------------------------------------------------------------------//
app.on("ready", () => {
  //-------------------------------------------------------------------------------------------------//
  /*
    画像用URL
  */
  //-------------------------------------------------------------------------------------------------//
  session.defaultSession.protocol.registerFileProtocol("image-fullsized", async (request, cb) => {
    const filename = request.url.split("/").pop()!;
    const returnPath = path.resolve(DIR_IMAGES, filename);
    cb({ path: returnPath });
  });
  session.defaultSession.protocol.registerFileProtocol("image-thumbnail", async (request, cb) => {
    const filename = request.url.split("/").pop()!;
    const returnPath = path.resolve(DIR_THUMBNAILS, filename + ".webp");
    cb({ path: returnPath });
  });
  //-------------------------------------------------------------------------------------------------//
  /*
    IPCのメインプロセス側のAPI
  */
  //-------------------------------------------------------------------------------------------------//
  const mainFunctions: MainFunctions = {
    /*------------------------------------
      ウインドウを表示
    ------------------------------------*/
    showMainWindow: async () => {
      window.show();
    },
    /*------------------------------------
      画像を開く
    ------------------------------------*/
    browseImages: async () => {
      logger.mainLog("#Browse Images");
      const file = await dialog.showOpenDialog(window, {
        properties: ["openFile", "multiSelections"]
      });
      if (file.canceled) {
        logger.mainLog("canceled");
        return 0;
      }
      logger.mainLog("return:", file.filePaths.length);
      importImages(file.filePaths);
      return file.filePaths.length;
    },
    /*------------------------------------
      URLからインポート
    ------------------------------------*/
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
          data = (await axios.get(url, { responseType: "arraybuffer" })).data;
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
    /*------------------------------------
      ファイルからインポート
    ------------------------------------*/
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
    /*------------------------------------
      全PetaImage取得
    ------------------------------------*/
    getPetaImages: async (event) => {
      try {
        logger.mainLog("#Get PetaImages");
        const data = await petaImagesDB.find({});
        const petaImages: PetaImages = {};
        data.forEach((pi) => {
          petaImages[pi.id] = upgradePetaImage(pi);
          pi._selected = false;
        });
        logger.mainLog("return:", data.length);
        return petaImages;
      } catch(e) {
        logger.mainLog("error:", e);
      }
      return {};
    },
    /*------------------------------------
      PetaImage 追加|更新|削除
    ------------------------------------*/
    savePetaImages: async (event, datas, mode) => {
      logger.mainLog("#Save PetaImages");
      try {
        for (let i = 0; i < datas.length; i ++) {
          await savePetaImage(datas[i], mode);
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
    /*------------------------------------
      全PetaBoard取得
    ------------------------------------*/
    getPetaBoards: async (event) => {
      try {
        logger.mainLog("#Get PetaBoards");
        const data = await boardsDB.find({});
        data.forEach((board) => {
          // バージョンアップ時のプロパティ更新
          addPetaBoardProperties(board);
          board.petaPanels.forEach((petaPanel) => {
            addPetaPanelProperties(petaPanel);
          });
        })
        if (data.length == 0) {
          logger.mainLog("no boards");
          const board = createPetaBoard(DEFAULT_BOARD_NAME, 0, settingsConfig.data.darkMode);
          await savePetaBoard(board, UpdateMode.INSERT);
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
    /*------------------------------------
      PetaBoard 追加|更新|削除
    ------------------------------------*/
    savePetaBoards: async (event, boards, mode) => {
      try {
        logger.mainLog("#Save PetaBoards");
        for (let i = 0; i < boards.length; i ++) {
          await savePetaBoard(boards[i], mode);
        }
        logger.mainLog("return:", true);
        return true;
      } catch(e) {
        logger.mainLog("error:", e);
      }
      return false;
    },
    /*------------------------------------
      ログ
    ------------------------------------*/
    log: async (event, ...args: any) => {
      logger.log(LogFrom.RENDERER, ...args);
      return true;
    },
    /*------------------------------------
      ダイアログ
    ------------------------------------*/
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
    /*------------------------------------
      WebブラウザでURLを開く
    ------------------------------------*/
    openURL: async (event, url) => {
      logger.mainLog("#Open URL");
      logger.mainLog("url:", url);
      shell.openExternal(url);
      return true;
    },
    /*------------------------------------
      PetaImageのファイルを開く
    ------------------------------------*/
    openImageFile: async (event, petaImage) => {
      shell.showItemInFolder(getImagePath(petaImage, ImageType.FULLSIZED));
    },
    /*------------------------------------
      アプリ情報
    ------------------------------------*/
    getAppInfo: async (event) => {
      logger.mainLog("#Get App Info");
      const info = {
        name: app.getName(),
        version: app.getVersion()
      };
      logger.mainLog("return:", info);
      return info;
    },
    /*------------------------------------
      DBフォルダを開く
    ------------------------------------*/
    showDBFolder: async (event) => {
      logger.mainLog("#Show DB Folder");
      shell.showItemInFolder(DIR_ROOT);
      return true;
    },
    /*------------------------------------
      全PetaBoard取得
    ------------------------------------*/
    showImageInFolder: async (event, petaImage) => {
      logger.mainLog("#Show Image In Folder");
      shell.showItemInFolder(getImagePath(petaImage, ImageType.FULLSIZED));
      return true;
    },
    /*------------------------------------
      アップデート確認
    ------------------------------------*/
    checkUpdate: async (event) => {
      try {
        logger.mainLog("#Check Update");
        const url = `${PACKAGE_JSON_URL}?hash=${uuid()}`;
        logger.mainLog("url:", url);
        logger.mainLog("currentVersion:", app.getVersion());
        const packageJSON = (await axios.get(url, { responseType: "json" })).data;
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
    /*------------------------------------
      設定保存
    ------------------------------------*/
    updateSettings: async (event, settings) => {
      try {
        logger.mainLog("#Update Settings");
        if (settingsConfig.data.enableHardwareAcceleration != settings.enableHardwareAcceleration) {
          logger.mainLog("change hardware accelaration:", settings.enableHardwareAcceleration);
          // app.relaunch();
        }
        settingsConfig.data = settings;
        window.setAlwaysOnTop(settingsConfig.data.alwaysOnTop);
        await settingsConfig.save();
        logger.mainLog("return:", settingsConfig.data);
        return true;
      } catch(e) {
        logger.mainLog(e);
      }
      return false;
    },
    /*------------------------------------
      設定取得
    ------------------------------------*/
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
    /*------------------------------------
      ウインドウのフォーカス取得
    ------------------------------------*/
    getWindowIsFocused: async (event) => {
      return window.isFocused();
    },
    /*------------------------------------
      ズームレベル変更
    ------------------------------------*/
    setZoomLevel: async (event, level) => {
      window.webContents.setZoomLevel(level);
    },
    /*------------------------------------
      最小化
    ------------------------------------*/
    windowMinimize: async (event) => {
      window.minimize();
    },
    /*------------------------------------
      最大化
    ------------------------------------*/
    windowMaximize: async (event) => {
      if (window.isMaximized()) {
        window.unmaximize();
        return;
      }
      window.maximize();
    },
    /*------------------------------------
      閉じる
    ------------------------------------*/
    windowClose: async (event) => {
      app.quit();
    },
    /*------------------------------------
      OS情報取得
    ------------------------------------*/
    getPlatform: async (event) => {
      return process.platform;
    },
    /*------------------------------------
      サムネイル再生成
    ------------------------------------*/
    regenerateThumbnails: async (event) => {
      logger.mainLog("#Regenerate Thumbnails");
      logger.mainLog("preset:", settingsConfig.data.thumbnails);
      sendToRenderer("regenerateThumbnailsBegin");
      const images = await petaImagesDB.find({});
      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        const data = await file.readFile(path.resolve(DIR_IMAGES, image.fileName));
        const result = await generateThumbnail(
          data,
          getImagePathFromFilename(image.fileName, ImageType.THUMBNAIL),
          settingsConfig.data.thumbnails.size,
          settingsConfig.data.thumbnails.quality
        );
        image.placeholder = result.placeholder;
        await savePetaImage(image, UpdateMode.UPDATE);
        logger.mainLog(`thumbnail (${i + 1} / ${images.length})`);
        sendToRenderer("regenerateThumbnailsProgress", i + 1, images.length);
      }
      sendToRenderer("regenerateThumbnailsComplete");
    }
  }
  // 上のAPIをipcのやつに登録
  Object.keys(mainFunctions).forEach((key) => {
    ipcMain.handle(key, (e: IpcMainInvokeEvent, ...args) => (mainFunctions as any)[key](e, ...args));
  });
  //-------------------------------------------------------------------------------------------------//
  /*
    ウインドウ生成と初期化
  */
  //-------------------------------------------------------------------------------------------------//
  createProtocol("app");
  initWindow();
  // function download(url: string, filename: string, callback: (res: string) => void) {
  //   const file = fs.createWriteStream(filename);
  //   let receivedBytes = 0
  //   // Send request to the given URL
  //   let totalBytes = 0;
  //   request.get(url)
  //   .on('response', (response) => {
  //     if (response.statusCode !== 200) {
  //       return callback('Response status was ' + response.statusCode);
  //     }
  //     const cl = response.headers['content-length'];
  //     if (cl) {
  //       totalBytes = parseInt(cl);
  //     }
  //   })
  //   .on('data', (chunk) => {
  //     receivedBytes += chunk.length;
  //     console.log(receivedBytes / totalBytes * 100);
  //   })
  //   .pipe(file)
  //   .on('error', (err) => {
  //     file.close();
  //     asyncFile.rm(filename);
  //     callback(err.message);
  //   });
  //   file
  //   .on('finish', () => {
  //     file.close();
  //     callback("fin");
  //   })
  //   .on('error', (err) => {
  //     asyncFile.rm(filename);
  //     return callback(err.message);
  //   });
  // }
});
// import request from "request";