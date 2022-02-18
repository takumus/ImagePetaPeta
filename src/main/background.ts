import { app, ipcMain, dialog, IpcMainInvokeEvent, shell, session, protocol, BrowserWindow } from "electron";
import * as Path from "path";
import axios from "axios";
import sharp from "sharp";
import crypto from "crypto";
import dataURIToBuffer from "data-uri-to-buffer";
import { encode as encodePlaceholder } from "blurhash";
import { v4 as uuid } from "uuid";
import { createProtocol } from "vue-cli-plugin-electron-builder/lib";

import { DEFAULT_BOARD_NAME, PACKAGE_JSON_URL, WINDOW_DEFAULT_HEIGHT, WINDOW_DEFAULT_WIDTH, WINDOW_MIN_HEIGHT, WINDOW_MIN_WIDTH } from "@/defines";
import * as file from "@/libs/file";
import DB from "@/libs/db";
import { imageFormatToExtention } from "@/utils/imageFormatToExtention";
import Logger from "@/libs/logger";
import Config from "@/libs/config";
import { PetaImage, PetaImages } from "@/datas/petaImage";
import { PetaBoard, createPetaBoard } from "@/datas/petaBoard";
import { ImportImageResult } from "@/datas/importImageResult";
import { UpdateMode } from "@/datas/updateMode";
import { LogFrom } from "@/datas/logFrom";
import { AddImageResult } from "@/datas/addImageResult";
import { Settings, defaultSettings } from "@/datas/settings";
import { addPetaPanelProperties } from "@/datas/petaPanel";
import { MainEvents } from "@/api/mainEvents";
import { MainFunctions } from "@/api/mainFunctions";
import { ImageType } from "@/datas/imageType";
import { defaultStates, States } from "@/datas/states";
import { upgradePetaBoard, upgradePetaImage, upgradeSettings, upgradeStates } from "@/utils/upgrader";
import { arrLast, minimId, noHtml } from "@/utils/utils";
import isValidFilePath from "@/utils/isValidFilePath";
(() => {
  /*------------------------------------
    シングルインスタンス化
  ------------------------------------*/
  if (!app.requestSingleInstanceLock()) {
    app.quit();
  }
  //-------------------------------------------------------------------------------------------------//
  /*
    window, ファイルパス, DBの定義
  */
  //-------------------------------------------------------------------------------------------------//
  let window: BrowserWindow;
  let DIR_ROOT: string;
  let DIR_APP: string;
  let DIR_LOG: string;
  let DIR_IMAGES: string;
  let DIR_THUMBNAILS: string;
  let FILE_LOG: string;
  let FILE_IMAGES_DB: string;
  let FILE_BOARDS_DB: string;
  let FILE_SETTINGS: string;
  let FILE_STATES: string;
  let dataLogger: Logger;
  let dataPetaImages: DB<PetaImage>;
  let dataPetaBoards: DB<PetaBoard>;
  let dataSettings: Config<Settings>;
  let dataStates: Config<States>;
  //-------------------------------------------------------------------------------------------------//
  /*
    ファイルパスとDBの、検証・読み込み・作成
  */
  //-------------------------------------------------------------------------------------------------//
  try {
    DIR_APP = file.initDirectory(false, app.getPath("userData"));
    FILE_SETTINGS = file.initFile(DIR_APP, "settings.json");
    dataSettings = new Config<Settings>(FILE_SETTINGS, defaultSettings, upgradeSettings);
    if (dataSettings.data.petaImageDirectory.default) {
      DIR_ROOT = file.initDirectory(true, app.getPath("pictures"), "imagePetaPeta");
      dataSettings.data.petaImageDirectory.path = DIR_ROOT;
    } else {
      try {
        if (!isValidFilePath(dataSettings.data.petaImageDirectory.path)) {
          throw new Error();
        }
        DIR_ROOT = file.initDirectory(true, dataSettings.data.petaImageDirectory.path);
      } catch (error) {
        dataSettings.data.petaImageDirectory.default = true;
        dataSettings.save();
        throw new Error(`Cannot access PetaImage directory: "${dataSettings.data.petaImageDirectory.path}"\nChanged to default directory. Please restart application.`);
      }
    }
    DIR_IMAGES = file.initDirectory(true, DIR_ROOT, "images");
    DIR_THUMBNAILS = file.initDirectory(true, DIR_ROOT, "thumbnails");
    FILE_IMAGES_DB = file.initFile(DIR_ROOT, "images.db");
    FILE_BOARDS_DB = file.initFile(DIR_ROOT, "boards.db");
    FILE_STATES = file.initFile(DIR_APP, "states.json");
    DIR_LOG = file.initDirectory(false, app.getPath("logs"));
    FILE_LOG = file.initFile(DIR_LOG, "logs.log");
    dataLogger = new Logger(FILE_LOG);
    dataPetaImages = new DB<PetaImage>(FILE_IMAGES_DB);
    dataPetaBoards = new DB<PetaBoard>(FILE_BOARDS_DB);
    dataStates = new Config<States>(FILE_STATES, defaultStates, upgradeStates);
  } catch (err) {
    //-------------------------------------------------------------------------------------------------//
    /*
      何らかの原因でファイルとディレクトリの準備が失敗した場合
      エラー画面を出してアプリ終了
    */
    //-------------------------------------------------------------------------------------------------//
    showError("M", 1, "Initialization Error", String(err));
    return;
  }
  //-------------------------------------------------------------------------------------------------//
  /*
    electronのready前にやらないといけない事
  */
  //-------------------------------------------------------------------------------------------------//
  protocol.registerSchemesAsPrivileged([{
    scheme: "app",
    privileges: {
      secure: true,
      standard: true
    }
  }]);
  app.on("window-all-closed", () => {
    dataLogger.mainLog("#Electron event: window-all-closed");
    if (process.platform != "darwin") {
      app.quit();
    }
  });
  app.on("activate", async () => {
    dataLogger.mainLog("#Electron event: activate");
    if (BrowserWindow.getAllWindows().length === 0) {
      initWindow();
    }
  });
  //-------------------------------------------------------------------------------------------------//
  /*
    electronのready
  */
  //-------------------------------------------------------------------------------------------------//
  app.on("ready", async () => {
    //-------------------------------------------------------------------------------------------------//
    /*
      画像用URL作成
    */
    //-------------------------------------------------------------------------------------------------//
    session.defaultSession.protocol.registerFileProtocol("image-fullsized", async (req, res) => {
      res({
        path: Path.resolve(DIR_IMAGES, arrLast(req.url.split("/"), ""))
      });
    });
    session.defaultSession.protocol.registerFileProtocol("image-thumbnail", async (req, res) => {
      res({
        path: Path.resolve(DIR_THUMBNAILS, arrLast(req.url.split("/"), "") + ".webp")
      });
    });
    //-------------------------------------------------------------------------------------------------//
    /*
      データベースのロード
    */
    //-------------------------------------------------------------------------------------------------//
    try {
      await dataPetaBoards.init();
      await dataPetaImages.init();
    } catch (error) {
      showError("M", 2, "Initialization Error", String(error));
      return;
    }
    //-------------------------------------------------------------------------------------------------//
    /*
      IPCのメインプロセス側のAPI
    */
    //-------------------------------------------------------------------------------------------------//
    const mainFunctions  = {
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
        dataLogger.mainLog("#Browse Images");
        const file = await dialog.showOpenDialog(window, {
          properties: ["openFile", "multiSelections"]
        });
        if (file.canceled) {
          dataLogger.mainLog("canceled");
          return 0;
        }
        dataLogger.mainLog("return:", file.filePaths.length);
        importImages(file.filePaths);
        return file.filePaths.length;
      },
      /*------------------------------------
        URLからインポート
      ------------------------------------*/
      importImageFromURL: async (event, url) => {
        try {
          sendToRenderer("importImagesBegin", 1);
          dataLogger.mainLog("#Import Image From URL");
          let data: Buffer;
          if (url.trim().indexOf("http") != 0) {
            // dataURIだったら
            dataLogger.mainLog("data uri");
            data = dataURIToBuffer(url);
          } else {
            // 普通のurlだったら
            dataLogger.mainLog("normal url:", url);
            data = (await axios.get(url, { responseType: "arraybuffer" })).data;
          }
          const extName = imageFormatToExtention((await sharp(data).metadata()).format);
          if (!extName) {
            dataLogger.mainLog("invalid image file");
            throw new Error("invalid image file");
          }
          const now = new Date();
          const addResult = await addImage(data, now.toLocaleString(), extName, now, now);
          sendToRenderer("importImagesProgress", 1, url, addResult.exists ? ImportImageResult.EXISTS : ImportImageResult.SUCCESS);
          sendToRenderer("importImagesComplete", 1, 1);
          dataLogger.mainLog("return: ", minimId(addResult.petaImage.id));
          return addResult.petaImage.id;
        } catch (err) {
          dataLogger.mainLog("error: ", err);
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
          dataLogger.mainLog("#Import Images From File Paths");
          const images = (await importImages(filePaths)).map((image) => image.id);
          dataLogger.mainLog("return:", true);
          return images;
        } catch(e) {
          dataLogger.mainLog("error:", e);
        }
        return [];
      },
      /*------------------------------------
        全PetaImage取得
      ------------------------------------*/
      getPetaImages: async (event) => {
        try {
          dataLogger.mainLog("#Get PetaImages");
          const data = await dataPetaImages.find({});
          const petaImages: PetaImages = {};
          data.forEach((pi) => {
            petaImages[pi.id] = upgradePetaImage(pi);
            pi._selected = false;
          });
          dataLogger.mainLog("return:", data.length);
          return petaImages;
        } catch(e) {
          dataLogger.mainLog("error:", e);
          showError("M", 3, "Get PetaImages Error", String(e));
        }
        return {};
      },
      /*------------------------------------
        PetaImage 追加|更新|削除
      ------------------------------------*/
      savePetaImages: async (event, datas, mode) => {
        dataLogger.mainLog("#Save PetaImages");
        try {
          for (let i = 0; i < datas.length; i ++) {
            await savePetaImage(datas[i], mode);
          }
        } catch (err) {
          dataLogger.mainLog("error:", err);
          showError("M", 4, "Save PetaImages Error", String(err));
        }
        if (mode != UpdateMode.UPDATE) {
          sendToRenderer("updatePetaImages");
        }
        dataLogger.mainLog("return:", true);
        return true;
      },
      /*------------------------------------
        全PetaBoard取得
      ------------------------------------*/
      getPetaBoards: async (event) => {
        try {
          dataLogger.mainLog("#Get PetaBoards");
          const data = await dataPetaBoards.find({});
          data.forEach((board) => {
            // バージョンアップ時のプロパティ更新
            upgradePetaBoard(board);
            board.petaPanels.forEach((petaPanel) => {
              addPetaPanelProperties(petaPanel);
            });
          })
          if (data.length == 0) {
            dataLogger.mainLog("no boards");
            const board = createPetaBoard(DEFAULT_BOARD_NAME, 0, dataSettings.data.darkMode);
            await savePetaBoard(board, UpdateMode.INSERT);
            data.push(board);
            dataLogger.mainLog("return:", data.length);
            return data;
          } else {
            dataLogger.mainLog("return:", data.length);
            return data;
          }
        } catch(e) {
          dataLogger.mainLog("error:", e);
          showError("M", 5, "Get PetaBoards Error", String(e));
        }
        return [];
      },
      /*------------------------------------
        PetaBoard 追加|更新|削除
      ------------------------------------*/
      savePetaBoards: async (event, boards, mode) => {
        try {
          dataLogger.mainLog("#Save PetaBoards");
          for (let i = 0; i < boards.length; i ++) {
            await savePetaBoard(boards[i], mode);
          }
          dataLogger.mainLog("return:", true);
          return true;
        } catch(e) {
          dataLogger.mainLog("error:", e);
          showError("M", 6, "Save PetaBoards Error", String(e));
        }
        return false;
      },
      /*------------------------------------
        ログ
      ------------------------------------*/
      log: async (event, ...args: any) => {
        dataLogger.log(LogFrom.RENDERER, ...args);
        return true;
      },
      /*------------------------------------
        ダイアログ
      ------------------------------------*/
      dialog: async (event, message, buttons) => {
        dataLogger.mainLog("#Dialog");
        dataLogger.mainLog("dialog:", message, buttons);
        const value = await dialog.showMessageBox(window, {
          title: "Petapeta",
          message: message,
          buttons: buttons,
          cancelId: -1
        });
        return value.response;
      },
      /*------------------------------------
        WebブラウザでURLを開く
      ------------------------------------*/
      openURL: async (event, url) => {
        dataLogger.mainLog("#Open URL");
        dataLogger.mainLog("url:", url);
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
        dataLogger.mainLog("#Get App Info");
        const info = {
          name: app.getName(),
          version: app.getVersion()
        };
        dataLogger.mainLog("return:", info);
        return info;
      },
      /*------------------------------------
        DBフォルダを開く
      ------------------------------------*/
      showDBFolder: async (event) => {
        dataLogger.mainLog("#Show DB Folder");
        shell.showItemInFolder(DIR_ROOT);
        return true;
      },
      /*------------------------------------
        全PetaBoard取得
      ------------------------------------*/
      showImageInFolder: async (event, petaImage) => {
        dataLogger.mainLog("#Show Image In Folder");
        shell.showItemInFolder(getImagePath(petaImage, ImageType.FULLSIZED));
        return true;
      },
      /*------------------------------------
        アップデート確認
      ------------------------------------*/
      checkUpdate: async (event) => {
        try {
          dataLogger.mainLog("#Check Update");
          const url = `${PACKAGE_JSON_URL}?hash=${uuid()}`;
          dataLogger.mainLog("url:", url);
          dataLogger.mainLog("currentVersion:", app.getVersion());
          const packageJSON = (await axios.get(url, { responseType: "json" })).data;
          dataLogger.mainLog("latestVersion:", packageJSON.version);
          return {
            current: app.getVersion(),
            latest: packageJSON.version
          }
        } catch(e) {
          dataLogger.mainLog("error:", e);
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
          dataLogger.mainLog("#Update Settings");
          if (dataSettings.data.enableHardwareAcceleration != settings.enableHardwareAcceleration) {
            dataLogger.mainLog("change hardware accelaration:", settings.enableHardwareAcceleration);
            // app.relaunch();
          }
          dataSettings.data = settings;
          window.setAlwaysOnTop(dataSettings.data.alwaysOnTop);
          await dataSettings.save();
          dataLogger.mainLog("return:", dataSettings.data);
          return true;
        } catch(e) {
          dataLogger.mainLog(e);
          showError("M", 7, "Update Settings Error", String(e));
        }
        return false;
      },
      /*------------------------------------
        設定取得
      ------------------------------------*/
      getSettings: async (event) => {
        try {
          dataLogger.mainLog("#Get Settings");
          dataLogger.mainLog("return:", dataSettings.data);
          return dataSettings.data;
        } catch(e) {
          dataLogger.mainLog(e);
          showError("M", 8, "Get Settings Error", String(e));
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
        try {
          dataLogger.mainLog("#Regenerate Thumbnails");
          dataLogger.mainLog("preset:", dataSettings.data.thumbnails);
          sendToRenderer("regenerateThumbnailsBegin");
          const images = await dataPetaImages.find({});
          for (let i = 0; i < images.length; i++) {
            const image = images[i];
            const data = await file.readFile(Path.resolve(DIR_IMAGES, image.fileName));
            const result = await generateThumbnail(
              data,
              getImagePathFromFilename(image.fileName, ImageType.THUMBNAIL),
              dataSettings.data.thumbnails.size,
              dataSettings.data.thumbnails.quality
            );
            image.placeholder = result.placeholder;
            await savePetaImage(image, UpdateMode.UPDATE);
            dataLogger.mainLog(`thumbnail (${i + 1} / ${images.length})`);
            sendToRenderer("regenerateThumbnailsProgress", i + 1, images.length);
          }
          sendToRenderer("regenerateThumbnailsComplete");
        } catch (err) {
          showError("M", 9, "Regenerate Thumbnails Error", String(err));
        }
      },
      /*------------------------------------
        PetaImageフォルダを選ぶ
      ------------------------------------*/
      browsePetaImageDirectory: async (event) => {
        dataLogger.mainLog("#Browse PetaImage Directory");
        const file = await dialog.showOpenDialog(window, {
          properties: ["openDirectory"]
        });
        if (file.canceled) {
          dataLogger.mainLog("canceled");
          return null;
        }
        if (file.filePaths.length < 1) {
          return null;
        }
        let path = Path.resolve(file.filePaths[0]);
        if (Path.basename(path) != "PetaImage") {
          path = Path.resolve(path, "PetaImage");
        }
        dataLogger.mainLog("return:", path);
        return path;
      },
      /*------------------------------------
        PetaImageフォルダを変更
      ------------------------------------*/
      changePetaImageDirectory: async (event, path) => {
        try {
          if (Path.resolve() == Path.resolve(path)) {
            return false;
          }
          if (DIR_APP == Path.resolve(path)) {
            return false;
          }
          path = file.initDirectory(true, path);
          dataSettings.data.petaImageDirectory.default = false;
          dataSettings.data.petaImageDirectory.path = path;
          dataSettings.save();
          relaunch();
          return true;
        } catch(error) {
          return false;
        }
      }
    } as {
      [P in keyof MainFunctions]: (event: IpcMainInvokeEvent, ...args: Parameters<MainFunctions[P]>) => ReturnType<MainFunctions[P]>
    };
    Object.keys(mainFunctions).forEach((key) => {
      ipcMain.handle(key, (e: IpcMainInvokeEvent, ...args) => (mainFunctions as any)[key](e, ...args));
    });
    //-------------------------------------------------------------------------------------------------//
    /*
      メインウインドウを初期化
    */
    //-------------------------------------------------------------------------------------------------//
    createProtocol("app");
    initWindow();
  });
  //-------------------------------------------------------------------------------------------------//
  /*
    色々な関数
  */
  //-------------------------------------------------------------------------------------------------//
  /*------------------------------------
    エラー表示
  ------------------------------------*/
  function showError(category: "M" | "R", code: number, title: string, error: string) {
    try {
      if (dataLogger) {
        dataLogger.mainLog("#Show Error", error);
      }
    } catch { }
    try {
      if (window) {
        window.loadURL("data:text/html;charset=utf-8,");
      }
    } catch { }
    function createWindow() {
      const errorWindow = new BrowserWindow({
        width: 512,
        height: 256,
        frame: true,
        show: true,
        webPreferences: {
          javascript: false
        }
      });
      errorWindow.menuBarVisible = false;
      errorWindow.center();
      errorWindow.loadURL(
        `data:text/html;charset=utf-8,
        <head>
        <title>${noHtml(app.getName())} Fatal Error</title>
        <style>pre { white-space: pre-wrap; } h1 { font-family: monospace; }</style>
        </head>
        <body>
        <h1>${category}${noHtml(('000' + code).slice(-3))} ${noHtml(title)}</h1>
        <pre>${noHtml(error)}</pre>
        </body>`
      );
      errorWindow.setAlwaysOnTop(true);
      errorWindow.on("close", () => {
        app.exit();
      });
    }
    if(app.isReady()) {
      createWindow();
    } else {
      app.on("ready", createWindow);
    }
  }
  /*------------------------------------
    PetaImage更新
  ------------------------------------*/
  async function savePetaImage(petaImage: PetaImage, mode: UpdateMode) {
    dataLogger.mainLog("##Save PetaImage");
    dataLogger.mainLog("mode:", mode);
    dataLogger.mainLog("image:", minimId(petaImage.id));
    petaImage.tags = Array.from(new Set(petaImage.tags));
    if (mode == UpdateMode.REMOVE) {
      await dataPetaImages.remove({ id: petaImage.id });
      dataLogger.mainLog("removed db");
      await file.rm(getImagePath(petaImage, ImageType.FULLSIZED)).catch((e) => {});
      dataLogger.mainLog("removed file");
      await file.rm(getImagePath(petaImage, ImageType.THUMBNAIL)).catch((e) => {});
      dataLogger.mainLog("removed thumbnail");
      return true;
    }
    petaImage._selected = undefined;
    await dataPetaImages.update({ id: petaImage.id }, petaImage, mode == UpdateMode.INSERT);
    dataLogger.mainLog("updated");
    // sendToRenderer("updatePetaImage", petaImage);
    return true;
  }
  /*------------------------------------
    PetaBoard更新
  ------------------------------------*/
  async function savePetaBoard(board: PetaBoard, mode: UpdateMode) {
    dataLogger.mainLog("##Save PetaBoard");
    dataLogger.mainLog("mode:", mode);
    dataLogger.mainLog("board:", minimId(board.id));
    if (mode == UpdateMode.REMOVE) {
      await dataPetaBoards.remove({ id: board.id });
      dataLogger.mainLog("removed");
      return true;
    }
    await dataPetaBoards.update({ id: board.id }, board, mode == UpdateMode.INSERT);
    dataLogger.mainLog("updated");
    return true;
  }
  /*------------------------------------
    ファイル名からパスを取得
  ------------------------------------*/
  function getImagePathFromFilename(fileName: string, type: ImageType) {
    const thumbnail = type == ImageType.THUMBNAIL;
    return Path.resolve(thumbnail ? DIR_THUMBNAILS : DIR_IMAGES, fileName + (thumbnail ? ".webp" : ""));
  }
  /*------------------------------------
    PetaImageからパスを取得
  ------------------------------------*/
  function getImagePath(petaImage: PetaImage, thumbnail: ImageType) {
    return getImagePathFromFilename(petaImage.fileName, thumbnail);
  }
  /*------------------------------------
    レンダラへipcで送信
  ------------------------------------*/
  function sendToRenderer<U extends keyof MainEvents>(key: U, ...args: Parameters<MainEvents[U]>): void {
    window.webContents.send(key, ...args);
  }
  /*------------------------------------
    画像インポート
  ------------------------------------*/
  async function importImages(filePaths: string[]) {
    sendToRenderer("importImagesBegin", filePaths.length);
    dataLogger.mainLog("##Import Images");
    dataLogger.mainLog("files:", filePaths.length);
    let addedFileCount = 0;
    const petaImages: PetaImage[] = [];
    const addDate = new Date();
    for (let i = 0; i < filePaths.length; i++) {
      const filePath = filePaths[i];
      dataLogger.mainLog("import:", i + 1, "/", filePaths.length);
      let result = ImportImageResult.SUCCESS;
      try {
        const data = await file.readFile(filePath);
        const name = Path.basename(filePath);
        const extName = Path.extname(filePath).replace(/\./g, "");
        const fileDate = (await file.stat(filePath)).mtime;
        const addResult = await addImage(data, name, extName, fileDate, addDate);
        petaImages.push(addResult.petaImage);
        if (addResult.exists) {
          result = ImportImageResult.EXISTS;
        }
        addedFileCount++;
        dataLogger.mainLog("imported", name, result);
      } catch (err) {
        dataLogger.mainLog("error:", err);
        result = ImportImageResult.ERROR;
      }
      sendToRenderer("importImagesProgress", (i + 1) / filePaths.length, filePath, result);
    }
    dataLogger.mainLog("return:", addedFileCount, "/", filePaths.length);
    sendToRenderer("importImagesComplete", filePaths.length, addedFileCount);
    return petaImages;
  }
  /*------------------------------------
    PetaImage取得
  ------------------------------------*/
  async function getPetaImage(id: string) {
    return (await dataPetaImages.find({ id }))[0];
  }
  /*------------------------------------
    PetaImage追加
  ------------------------------------*/
  async function addImage(data: Buffer, name: string, extName: string, fileDate: Date, addDate: Date): Promise<AddImageResult> {
    const id = crypto.createHash("sha256").update(data).digest("hex");
    const exists = await getPetaImage(id);
    if (exists) return {
      petaImage: exists,
      exists: true
    };
    const fileName = `${id}.${extName}`;
    const output = await generateThumbnail(
      data,
      getImagePathFromFilename(fileName, ImageType.THUMBNAIL),
      dataSettings.data.thumbnails.size,
      dataSettings.data.thumbnails.quality
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
    await dataPetaImages.update({ id: petaImage.id }, petaImage, true);
    return {
      petaImage: petaImage,
      exists: false
    };
  }
  /*------------------------------------
    サムネイル作成
  ------------------------------------*/
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
          res(encodePlaceholder(new Uint8ClampedArray(buffer), width, height, 4, 4));
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
  /*------------------------------------
    メインウインドウ初期化
  ------------------------------------*/
  async function initWindow() {
    window = new BrowserWindow({
      width: WINDOW_DEFAULT_WIDTH,
      height: WINDOW_DEFAULT_HEIGHT,
      minWidth: WINDOW_MIN_WIDTH,
      minHeight: WINDOW_MIN_HEIGHT,
      frame: false,
      titleBarStyle: "hiddenInset",
      show: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: Path.join(__dirname, "preload.js")
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
    window.setSize(dataStates.data.windowSize.width, dataStates.data.windowSize.height);
    if (dataStates.data.windowIsMaximized) {
      window.maximize();
    }
    window.on("close", () => {
      if (!window.isMaximized()) {
        dataStates.data.windowSize.width = window.getSize()[0];
        dataStates.data.windowSize.height = window.getSize()[1];
      }
      dataStates.data.windowIsMaximized = window.isMaximized();
      dataStates.save();
      dataLogger.mainLog("#Save Window Size", dataStates.data.windowSize);
    });
    window.addListener("blur", () => {
      sendToRenderer("windowFocused", false);
    });
    window.addListener("focus", () => {
      sendToRenderer("windowFocused", true);
    });
    window.setAlwaysOnTop(dataSettings.data.alwaysOnTop);
    return window;
  }
  /*------------------------------------
    スプラッシュ画面初期化
  ------------------------------------*/
  async function initSplash() {
    const window = new BrowserWindow({
      width: 300,
      height: 100,
      frame: false,
      show: true
    });
    window.center();
    if (process.env.WEBPACK_DEV_SERVER_URL) {
    } else {
      await window.loadURL("app://./splash.html");
    }
    window.setAlwaysOnTop(true);
    return window;
  }
  /*------------------------------------
    アプリ再起動
  ------------------------------------*/
  function relaunch() {
    app.relaunch();
    app.exit();
  }
})();