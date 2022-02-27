import { app, ipcMain, dialog, IpcMainInvokeEvent, shell, session, protocol, BrowserWindow, clipboard } from "electron";
import * as Path from "path";
import axios from "axios";
import sharp from "sharp";
import crypto from "crypto";
import dataURIToBuffer from "data-uri-to-buffer";
import { encode as encodePlaceholder } from "blurhash";
import { v4 as uuid } from "uuid";
import { createProtocol } from "vue-cli-plugin-electron-builder/lib";

import { DEFAULT_BOARD_NAME, PACKAGE_JSON_URL, WINDOW_DEFAULT_HEIGHT, WINDOW_DEFAULT_WIDTH, WINDOW_MIN_HEIGHT, WINDOW_MIN_WIDTH } from "@/commons/defines";
import * as file from "@/mainProcess/storages/file";
import DB from "@/mainProcess/storages/db";
import { imageFormatToExtention } from "@/mainProcess/utils/imageFormatToExtention";
import { Logger, LogFrom } from "@/mainProcess/storages/logger";
import Config from "@/mainProcess/storages/config";
import { PetaImage, PetaImages } from "@/commons/datas/petaImage";
import { PetaBoard, createPetaBoard } from "@/commons/datas/petaBoard";
import { ImportImageResult } from "@/commons/api/interfaces/importImageResult";
import { UpdateMode } from "@/commons/api/interfaces/updateMode";
import { Settings, defaultSettings } from "@/commons/datas/settings";
import { addPetaPanelProperties } from "@/commons/datas/petaPanel";
import { MainEvents } from "@/commons/api/mainEvents";
import { MainFunctions } from "@/commons/api/mainFunctions";
import { ImageType } from "@/commons/datas/imageType";
import { defaultStates, States } from "@/commons/datas/states";
import { upgradePetaBoard, upgradePetaImage, upgradePetaTag, upgradeSettings, upgradeStates } from "@/mainProcess/utils/upgrader";
import { arrLast, minimId, noHtml } from "@/commons/utils/utils";
import isValidFilePath from "@/mainProcess/utils/isValidFilePath";
import { promiseSerial } from "@/commons/utils/promiseSerial";
import dateFormat from "dateformat";
import { PetaTag } from "@/commons/datas/petaTag";
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
  let FILE_TAGS_DB: string;
  let FILE_SETTINGS: string;
  let FILE_STATES: string;
  let dataLogger: Logger;
  let dataPetaImages: DB<PetaImage>;
  let dataPetaBoards: DB<PetaBoard>;
  let dataPetaTags: DB<PetaTag>;
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
    FILE_TAGS_DB = file.initFile(DIR_ROOT, "tags.db");
    FILE_STATES = file.initFile(DIR_APP, "states.json");
    DIR_LOG = file.initDirectory(false, app.getPath("logs"));
    FILE_LOG = file.initFile(DIR_LOG, "logs.log");
    dataLogger = new Logger(FILE_LOG);
    dataPetaImages = new DB<PetaImage>(FILE_IMAGES_DB);
    dataPetaBoards = new DB<PetaBoard>(FILE_BOARDS_DB);
    dataPetaTags = new DB<PetaTag>(FILE_TAGS_DB);
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
      await dataPetaTags.init();
      const data = await dataPetaImages.find({});
      const petaImages: PetaImages = {};
      data.forEach((pi) => {
        petaImages[pi.id] = upgradePetaImage(pi);
      });
      await upgradePetaTag(dataPetaTags, petaImages);
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
      importImageFiles: async () => {
        dataLogger.mainLog("#Browse Image Files");
        const result = await dialog.showOpenDialog(window, {
          properties: ["openFile", "multiSelections"]
        });
        if (result.canceled) {
          dataLogger.mainLog("canceled");
          return 0;
        }
        dataLogger.mainLog("return:", result.filePaths.length);
        importImagesFromFilePaths(result.filePaths);
        return result.filePaths.length;
      },
      /*------------------------------------
        画像を開く
      ------------------------------------*/
      importImageDirectories: async () => {
        dataLogger.mainLog("#Browse Image Directories");
        const result = await dialog.showOpenDialog(window, {
          properties: ["openDirectory"]
        });
        if (result.canceled) {
          dataLogger.mainLog("canceled");
          return 0;
        }
        const filePaths = await file.readDirRecursive(result.filePaths[0]);
        dataLogger.mainLog("return:", filePaths.length);
        importImagesFromFilePaths(filePaths);
        return filePaths.length;
      },
      /*------------------------------------
        URLからインポート
      ------------------------------------*/
      importImageFromURL: async (event, url) => {
        try {
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
          const id = (await importImagesFromBuffers([data], "download"))[0].id;
          return id;
        } catch (err) {
          dataLogger.mainError(err);
        }
        return "";
      },
      /*------------------------------------
        ファイルからインポート
      ------------------------------------*/
      importImagesFromFilePaths: async (event, filePaths) =>{
        try {
          dataLogger.mainLog("#Import Images From File Paths");
          const _filePaths: string[] = [];
          await promiseSerial(async (path, index) => {
            _filePaths.push(...await file.readDirRecursive(path));
          }, filePaths).value;
          const images = (await importImagesFromFilePaths(_filePaths)).map((image) => image.id);
          return images;
        } catch(e) {
          dataLogger.mainError(e);
        }
        return [];
      },
      /*------------------------------------
        クリップボードからインポート
      ------------------------------------*/
      importImagesFromClipboard: async (event, buffers) => {
        try {
          dataLogger.mainLog("#Import Images From Clipboard");
          return (await importImagesFromBuffers(buffers, "clipboard")).map((petaImage) => petaImage.id);
        } catch (error) {
          dataLogger.mainError(error);
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
          });
          dataLogger.mainLog("return:", data.length);
          return petaImages;
        } catch(e) {
          dataLogger.mainError(e);
          showError("M", 3, "Get PetaImages Error", String(e));
        }
        return {};
      },
      /*------------------------------------
        PetaImage 追加|更新|削除
      ------------------------------------*/
      updatePetaImages: async (event, datas, mode) => {
        dataLogger.mainLog("#Update PetaImages");
        try {
          await promiseSerial((data) => updatePetaImage(data, mode), datas).value;
        } catch (err) {
          dataLogger.mainError(err);
          showError("M", 4, "Update PetaImages Error", String(err));
        }
        if (mode != UpdateMode.UPDATE) {
          emitMainEvent("updatePetaImages");
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
            await updatePetaBoard(board, UpdateMode.INSERT);
            data.push(board);
            dataLogger.mainLog("return:", data.length);
            return data;
          } else {
            dataLogger.mainLog("return:", data.length);
            return data;
          }
        } catch(e) {
          dataLogger.mainError(e);
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
          await promiseSerial((board) => updatePetaBoard(board, mode), boards).value;
          dataLogger.mainLog("return:", true);
          return true;
        } catch(e) {
          dataLogger.mainError(e);
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
        dataLogger.mainLog("#Open Image File");
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
          dataLogger.mainError(e);
        }
        return {
          current: app.getVersion(),
          latest: app.getVersion()
        };
      },
      /*------------------------------------
        設定保存
      ------------------------------------*/
      updateSettings: async (event, settings) => {
        try {
          dataLogger.mainLog("#Update Settings");
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
        dataLogger.mainLog("#Get Window Is Focused");
        const isFocued = window.isFocused();
        dataLogger.mainLog("return:", isFocued);
        return isFocued;
      },
      /*------------------------------------
        ズームレベル変更
      ------------------------------------*/
      setZoomLevel: async (event, level) => {
        dataLogger.mainLog("#Set Zoom Level");
        dataLogger.mainLog("level:", level);
        window.webContents.setZoomLevel(level);
      },
      /*------------------------------------
        最小化
      ------------------------------------*/
      windowMinimize: async (event) => {
        dataLogger.mainLog("#Window Minimize");
        window.minimize();
      },
      /*------------------------------------
        最大化
      ------------------------------------*/
      windowMaximize: async (event) => {
        dataLogger.mainLog("#Window Maximize");
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
        dataLogger.mainLog("#Window Close");
        app.quit();
      },
      /*------------------------------------
        OS情報取得
      ------------------------------------*/
      getPlatform: async (event) => {
        dataLogger.mainLog("#Get Platform");
        dataLogger.mainLog("return:", process.platform);
        return process.platform;
      },
      /*------------------------------------
        サムネイル再生成
      ------------------------------------*/
      regenerateThumbnails: async (event) => {
        try {
          dataLogger.mainLog("#Regenerate Thumbnails");
          dataLogger.mainLog("preset:", dataSettings.data.thumbnails);
          emitMainEvent("regenerateThumbnailsBegin");
          const images = await dataPetaImages.find({});
          const generate = async (image: PetaImage, i: number) => {
            const data = await file.readFile(Path.resolve(DIR_IMAGES, image.fileName));
            const result = await generateThumbnail(
              data,
              getImagePathFromFilename(image.fileName, ImageType.THUMBNAIL),
              dataSettings.data.thumbnails.size,
              dataSettings.data.thumbnails.quality
            );
            image.placeholder = result.placeholder;
            await updatePetaImage(image, UpdateMode.UPDATE);
            dataLogger.mainLog(`thumbnail (${i + 1} / ${images.length})`);
            emitMainEvent("regenerateThumbnailsProgress", i + 1, images.length);
          }
          await promiseSerial(generate, images).value;
          emitMainEvent("regenerateThumbnailsComplete");
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
          dataLogger.mainLog("#Change PetaImage Directory");
          path = Path.resolve(path);
          if (Path.resolve() == path) {
            dataLogger.mainError("Invalid file path:", path);
            return false;
          }
          if (DIR_APP == path) {
            dataLogger.mainError("Invalid file path:", path);
            return false;
          }
          path = file.initDirectory(true, path);
          dataSettings.data.petaImageDirectory.default = false;
          dataSettings.data.petaImageDirectory.path = path;
          dataSettings.save();
          relaunch();
          return true;
        } catch(error) {
          dataLogger.mainError(error);
          return false;
        }
      },
      /*------------------------------------
        States
      ------------------------------------*/
      getStates: async (event) => {
        dataLogger.mainLog("#Get States");
        return dataStates.data;
      },
      /*------------------------------------
        選択中のボードのidを保存
      ------------------------------------*/
      setSelectedPetaBoard: async (event, petaBoardId: string) => {
        dataLogger.mainLog("#Set Selected PetaBoard");
        dataLogger.mainLog("id:", petaBoardId);
        dataStates.data.selectedPetaBoardId = petaBoardId;
        dataStates.save();
        return;
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
  async function updatePetaImage(petaImage: PetaImage, mode: UpdateMode) {
    dataLogger.mainLog("##Update PetaImage");
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
    await dataPetaImages.update({ id: petaImage.id }, petaImage, mode == UpdateMode.INSERT);
    dataLogger.mainLog("updated");
    // emitMainEvent("updatePetaImage", petaImage);
    return true;
  }
  /*------------------------------------
    PetaBoard更新
  ------------------------------------*/
  async function updatePetaBoard(board: PetaBoard, mode: UpdateMode) {
    dataLogger.mainLog("##Update PetaBoard");
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
  function emitMainEvent<U extends keyof MainEvents>(key: U, ...args: Parameters<MainEvents[U]>): void {
    window.webContents.send(key, ...args);
  }
  /*------------------------------------
    画像インポート(ファイルパス)
  ------------------------------------*/
  async function importImagesFromFilePaths(filePaths: string[]) {
    emitMainEvent("importImagesBegin", filePaths.length);
    dataLogger.mainLog("##Import Images From File Paths");
    dataLogger.mainLog("files:", filePaths.length);
    let addedFileCount = 0;
    const petaImages: PetaImage[] = [];
    const importImage = async (filePath: string, index: number) => {
      dataLogger.mainLog("import:", index + 1, "/", filePaths.length);
      let result = ImportImageResult.SUCCESS;
      try {
        const data = await file.readFile(filePath);
        const name = Path.basename(filePath);
        const extName = Path.extname(filePath).replace(/\./g, "");
        const fileDate = (await file.stat(filePath)).mtime;
        const addResult = await addImage({
          data, name, extName, fileDate
        });
        petaImages.push(addResult.petaImage);
        if (addResult.exists) {
          result = ImportImageResult.EXISTS;
        }
        addedFileCount++;
        dataLogger.mainLog("imported", name, result);
      } catch (err) {
        dataLogger.mainError(err);
        result = ImportImageResult.ERROR;
      }
      emitMainEvent("importImagesProgress", index + 1, filePath, result);
    }
    await promiseSerial(importImage, filePaths).value;
    dataLogger.mainLog("return:", addedFileCount, "/", filePaths.length);
    emitMainEvent("importImagesComplete", filePaths.length, addedFileCount);
    return petaImages;
  }
  /*------------------------------------
    画像インポート(バッファー)
  ------------------------------------*/
  async function importImagesFromBuffers(buffers: Buffer[], name: string) {
    emitMainEvent("importImagesBegin", buffers.length);
    dataLogger.mainLog("##Import Images From Buffers");
    dataLogger.mainLog("buffers:", buffers.length);
    let addedFileCount = 0;
    const petaImages: PetaImage[] = [];
    const importImage = async (buffer: Buffer, index: number) => {
      dataLogger.mainLog("import:", index + 1, "/", buffers.length);
      let result = ImportImageResult.SUCCESS;
      try {
        const addResult = await addImage({
          data: buffer, name
        });
        petaImages.push(addResult.petaImage);
        if (addResult.exists) {
          result = ImportImageResult.EXISTS;
        }
        addedFileCount++;
        dataLogger.mainLog("imported", name, result);
      } catch (err) {
        dataLogger.mainError(err);
        result = ImportImageResult.ERROR;
      }
      emitMainEvent("importImagesProgress", index + 1, name, result);
    }
    await promiseSerial(importImage, buffers).value;
    dataLogger.mainLog("return:", addedFileCount, "/", buffers.length);
    emitMainEvent("importImagesComplete", buffers.length, addedFileCount);
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
  async function addImage(param: { data: Buffer, name: string, extName?: string, fileDate?: Date, addDate?: Date }): Promise<{ exists: boolean, petaImage: PetaImage }> {
    const id = crypto.createHash("sha256").update(param.data).digest("hex");
    const exists = await getPetaImage(id);
    if (exists) return {
      petaImage: exists,
      exists: true
    };
    const extName = param.extName || imageFormatToExtention((await sharp(param.data).metadata()).format);
    if (!extName) {
      throw new Error("invalid image file type");
    }
    const addDate = param.addDate || new Date();
    const fileDate = param.fileDate || new Date();
    const fileName = `${id}.${extName}`;
    const output = await generateThumbnail(
      param.data,
      getImagePathFromFilename(fileName, ImageType.THUMBNAIL),
      dataSettings.data.thumbnails.size,
      dataSettings.data.thumbnails.quality
    );
    const petaImage: PetaImage = {
      fileName: fileName,
      name: param.name,
      fileDate: fileDate.getTime(),
      addDate: addDate.getTime(),
      width: 1,
      height: output.sharp.height / output.sharp.width,
      placeholder: output.placeholder,
      id: id,
      tags: dataSettings.data.autoAddTag ? [dateFormat(addDate, "yyyy-mm-dd")] : [],
      nsfw: false
    }
    await file.writeFile(getImagePathFromFilename(fileName, ImageType.FULLSIZED), param.data);
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
      emitMainEvent("windowFocused", false);
    });
    window.addListener("focus", () => {
      emitMainEvent("windowFocused", true);
    });
    window.setAlwaysOnTop(dataSettings.data.alwaysOnTop);
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