import { app, ipcMain, dialog, IpcMainInvokeEvent, shell, session, protocol, BrowserWindow, nativeImage, nativeTheme } from "electron";
import * as Path from "path";
import axios from "axios";
import dataURIToBuffer from "data-uri-to-buffer";
import { v4 as uuid } from "uuid";
import { createProtocol } from "vue-cli-plugin-electron-builder/lib";
import { createI18n } from "vue-i18n";
import languages from "@/commons/languages";
import { BOARD_DARK_BACKGROUND_FILL_COLOR, BOARD_DEFAULT_BACKGROUND_FILL_COLOR, DEFAULT_BOARD_NAME, PACKAGE_JSON_URL, SEARCH_IMAGE_BY_GOOGLE_TIMEOUT, SEARCH_IMAGE_BY_GOOGLE_URL, UPDATE_CHECK_INTERVAL, WINDOW_DEFAULT_HEIGHT, WINDOW_DEFAULT_WIDTH, WINDOW_MIN_HEIGHT, WINDOW_MIN_WIDTH, WINDOW_SETTINGS_HEIGHT, WINDOW_SETTINGS_WIDTH } from "@/commons/defines";
import * as file from "@/mainProcess/storages/file";
import DB from "@/mainProcess/storages/db";
import { Logger, LogFrom } from "@/mainProcess/storages/logger";
import Config from "@/mainProcess/storages/config";
import { PetaImage, PetaImages } from "@/commons/datas/petaImage";
import { createPetaBoard, PetaBoard } from "@/commons/datas/petaBoard";
import { UpdateMode } from "@/commons/api/interfaces/updateMode";
import { Settings, getDefaultSettings } from "@/commons/datas/settings";
import { MainEvents } from "@/commons/api/mainEvents";
import { MainFunctions } from "@/commons/api/mainFunctions";
import { ImageType } from "@/commons/datas/imageType";
import { defaultStates, States } from "@/commons/datas/states";
import { upgradePetaImage, upgradePetaTag, upgradePetaImagesPetaTags, upgradeSettings, upgradeStates, upgradeWindowStates } from "@/mainProcess/utils/upgrader";
import { arrLast, minimId } from "@/commons/utils/utils";
import isValidFilePath from "@/mainProcess/utils/isValidFilePath";
import { promiseSerial } from "@/commons/utils/promiseSerial";
import { PetaTag } from "@/commons/datas/petaTag";
import { PetaImagePetaTag } from "@/commons/datas/petaImagesPetaTags";
import { MainLogger } from "@/mainProcess/utils/mainLogger";
import { showErrorWindow, ErrorWindowParameters } from "@/mainProcess/errors/errorWindow";
import { PetaDatas } from "@/mainProcess/petaDatas";
import crypto from "crypto";
import * as Tasks from "@/mainProcess/tasks/task";
import { isLatest } from "@/commons/utils/versionCheck";
import { RemoteBinaryInfo } from "@/commons/datas/remoteBinaryInfo";
import Transparent from "@/@assets/transparent.png";
import { DraggingPreviewWindow } from "./draggingPreviewWindow/draggingPreviewWindow";
import { getURLFromImgTag } from "@/rendererProcess/utils/getURLFromImgTag";
import { WindowType } from "@/commons/datas/windowType";
import { defaultWindowStates, WindowStates } from "@/commons/datas/windowStates";
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
  const windows: { [key in WindowType]?: BrowserWindow | undefined } = {};
  const activeWindows: { [key in WindowType]?: boolean } = {};
  let mainWindowType: WindowType | undefined = undefined; 
  let temporaryShowNSFW = false;
  let draggingPreviewWindow: DraggingPreviewWindow;
  let detailsPetaImage: PetaImage | undefined = undefined;
  let DIR_ROOT: string;
  let DIR_APP: string;
  let DIR_LOG: string;
  let DIR_IMAGES: string;
  let DIR_THUMBNAILS: string;
  let DIR_TEMP: string;
  let DIR_DOWNLOAD: string;
  let FILE_IMAGES_DB: string;
  let FILE_BOARDS_DB: string;
  let FILE_TAGS_DB: string;
  let FILE_IMAGES_TAGS_DB: string;
  let FILE_SETTINGS: string;
  let FILE_STATES: string;
  let FILE_WINDOW_STATES: string;
  let dataLogger: Logger;
  let dataPetaImages: DB<PetaImage>;
  let dataPetaBoards: DB<PetaBoard>;
  let dataPetaTags: DB<PetaTag>;
  let dataPetaImagesPetaTags: DB<PetaImagePetaTag>;
  let dataSettings: Config<Settings>;
  let dataStates: Config<States>;
  let dataWindowStates: Config<WindowStates>;
  let petaDatas: PetaDatas;
  let updateInstallerFilePath: string;
  let checkUpdateTimeoutHandler: NodeJS.Timeout;
  let dropFromBrowserPetaImageIds: string[] | undefined = undefined;
  const i18n = createI18n({
    locale: "ja",
    messages: languages,
  });
  const mainLogger = new MainLogger();
  //-------------------------------------------------------------------------------------------------//
  /*
    ファイルパスとDBの、検証・読み込み・作成
  */
  //-------------------------------------------------------------------------------------------------//
  try {
    // ログは最優先で初期化
    DIR_LOG = file.initDirectory(false, app.getPath("logs"));
    dataLogger = new Logger(DIR_LOG);
    mainLogger.logger = dataLogger;
    // その他の初期化
    DIR_APP = file.initDirectory(false, app.getPath("userData"));
    DIR_TEMP = file.initDirectory(true, app.getPath("temp"), `imagePetaPeta-beta${uuid()}`);
    FILE_SETTINGS = file.initFile(DIR_APP, "settings.json");
    DIR_DOWNLOAD = file.initDirectory(false, app.getPath("downloads"));
    dataSettings = new Config<Settings>(FILE_SETTINGS, getDefaultSettings(), upgradeSettings);
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
    FILE_IMAGES_TAGS_DB = file.initFile(DIR_ROOT, "images_tags.db");
    FILE_STATES = file.initFile(DIR_APP, "states.json");
    FILE_WINDOW_STATES = file.initFile(DIR_APP, "windowStates.json");
    dataPetaImages = new DB<PetaImage>("petaImages", FILE_IMAGES_DB);
    dataPetaBoards = new DB<PetaBoard>("petaBoards", FILE_BOARDS_DB);
    dataPetaTags = new DB<PetaTag>("petaTags", FILE_TAGS_DB);
    dataPetaImagesPetaTags = new DB<PetaImagePetaTag>("petaImagePetaTag", FILE_IMAGES_TAGS_DB);
    dataStates = new Config<States>(FILE_STATES, defaultStates, upgradeStates);
    dataWindowStates = new Config<WindowStates>(FILE_WINDOW_STATES, defaultWindowStates, upgradeWindowStates);
    [dataPetaImages, dataPetaBoards, dataPetaTags, dataPetaImagesPetaTags].forEach((db) => {
      db.on("beginCompaction", () => {
        mainLogger.logChunk().log(`begin compaction(${db.name})`);
      });
      db.on("doneCompaction", () => {
        mainLogger.logChunk().log(`done compaction(${db.name})`);
      });
      db.on("compactionError", (error) => {
        mainLogger.logChunk().error(`compaction error(${db.name})`, error);
      })
    })
    Tasks.onEmitStatus((id, status) => {
      emitMainEvent("taskStatus", id, status);
    });
    petaDatas = new PetaDatas(
      {
        dataPetaBoards,
        dataPetaImages,
        dataPetaImagesPetaTags,
        dataPetaTags,
        dataSettings
      }, {
        DIR_IMAGES,
        DIR_THUMBNAILS,
        DIR_TEMP
      }, 
      emitMainEvent,
      mainLogger
    );
  } catch (err) {
    //-------------------------------------------------------------------------------------------------//
    /*
      何らかの原因でファイルとディレクトリの準備が失敗した場合
      エラー画面を出してアプリ終了
    */
    //-------------------------------------------------------------------------------------------------//
    showError({
      category: "M",
      code: 1,
      title: "Initialization Error",
      message: String(err)
    });
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
  app.on("activate", async () => {
    mainLogger.logChunk().log("$Electron event: activate");
    if (
      (windows.board === undefined || windows.board.isDestroyed())
      && (windows.browser === undefined || windows.browser.isDestroyed())
    ) {
      showWindows();
    }
  });
  app.on("before-quit", (event) => {
    draggingPreviewWindow.destroy();
  });
  app.on("window-all-closed", () => {
    //
  });
  app.setAsDefaultProtocolClient("image-petapeta")
  //-------------------------------------------------------------------------------------------------//
  /*
    electronのready
  */
  //-------------------------------------------------------------------------------------------------//
  app.on("ready", async () => {
    mainLogger.logChunk().log(`\n####################################\n#-------APPLICATION LAUNCHED-------#\n####################################`);
    mainLogger.logChunk().log(`verison: ${app.getVersion()}`);
    //-------------------------------------------------------------------------------------------------//
    /*
      画像用URL作成
    */
    //-------------------------------------------------------------------------------------------------//
    session.defaultSession.protocol.registerFileProtocol("image-original", async (req, res) => {
      res({
        path: Path.resolve(DIR_IMAGES, arrLast(req.url.split("/"), ""))
      });
    });
    session.defaultSession.protocol.registerFileProtocol("image-thumbnail", async (req, res) => {
      res({
        path: Path.resolve(DIR_THUMBNAILS, arrLast(req.url.split("/"), ""))
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
      await dataPetaImagesPetaTags.init();
      await dataPetaTags.ensureIndex({
        fieldName: "id",
        unique: true
      });
    } catch (error) {
      showError({
        category: "M",
        code: 2,
        title: "Initialization Error",
        message: String(error)
      });
      return;
    }
    //-------------------------------------------------------------------------------------------------//
    /*
      データのマイグレーション
    */
    //-------------------------------------------------------------------------------------------------//
    try {
      const petaImagesArray = await dataPetaImages.find({});
      const petaImages: PetaImages = {};
      petaImagesArray.forEach((pi) => {
        petaImages[pi.id] = upgradePetaImage(pi);
      });
      if (await upgradePetaTag(dataPetaTags, petaImages)) {
        mainLogger.logChunk().log("Upgrade Tags");
        await promiseSerial((pi) => petaDatas.updatePetaImage(pi, UpdateMode.UPDATE), petaImagesArray).promise;
      }
      if (await upgradePetaImagesPetaTags(dataPetaTags, dataPetaImagesPetaTags, petaImages)) {
        mainLogger.logChunk().log("Upgrade PetaImagesPetaTags");
      }
    } catch (error) {
      showError({
        category: "M",
        code: 3,
        title: "Migration Error",
        message: String(error)
      });
      return;
    }
    //-------------------------------------------------------------------------------------------------//
    /*
      ipcへ関数を登録
    */
    //-------------------------------------------------------------------------------------------------//
    const mainFunctions = getMainFunctions();
    Object.keys(mainFunctions).forEach((key) => {
      ipcMain.handle(key, (e: IpcMainInvokeEvent, ...args) => (mainFunctions as any)[key](e, ...args));
    });
    //-------------------------------------------------------------------------------------------------//
    /*
      メインウインドウ・プレビューウインドウを初期化
    */
    //-------------------------------------------------------------------------------------------------//
    createProtocol("app");
    nativeTheme.on("updated", () => {
      emitDarkMode();
    })
    showWindows();
    draggingPreviewWindow = new DraggingPreviewWindow();
    //-------------------------------------------------------------------------------------------------//
    /*
      IPCのメインプロセス側のAPI
    */
    //-------------------------------------------------------------------------------------------------//
    function getMainFunctions(): {
      [P in keyof MainFunctions]: (event: IpcMainInvokeEvent, ...args: Parameters<MainFunctions[P]>) => ReturnType<MainFunctions[P]>
    } {
      return {
        async showMainWindow() {
          checkUpdate();
        },
        async importImageFiles(event) {
          const log = mainLogger.logChunk();
          log.log("#Browse Image Files");
          const window = getWindowByEvent(event);
          if (window) {
            const result = await dialog.showOpenDialog(window.window, {
              properties: ["openFile", "multiSelections"]
            });
            if (result.canceled) {
              log.log("canceled");
              return 0;
            }
            log.log("return:", result.filePaths.length);
            petaDatas.importImagesFromFilePaths(result.filePaths);
            return result.filePaths.length;
          }
          log.log("window is not ready");
          return 0;
        },
        async importImageDirectories(event) {
          const log = mainLogger.logChunk();
          log.log("#Browse Image Directories");
          const window = getWindowByEvent(event);
          if (window) {
            const result = await dialog.showOpenDialog(window.window, {
              properties: ["openDirectory"]
            });
            if (result.canceled) {
              log.log("canceled");
              return 0;
            }
            const filePath = result.filePaths[0];
            if (!filePath) {
              log.error("filePath is empty");
              return 0;
            }
            // log.log("return:", files.length);
            petaDatas.importImagesFromFilePaths([filePath]);
            return filePath.length;
          }
          log.log("window is not ready");
          return 0;
        },
        async importImagesFromClipboard(event, buffers) {
          const log = mainLogger.logChunk();
          try {
            log.log("#Import Images From Clipboard");
            return (await petaDatas.importImagesFromBuffers(buffers.map((buffer) => {
              return {
                buffer: buffer,
                name: "clipboard",
                note: ""
              }
            }))).map((petaImage) => petaImage.id);
          } catch (error) {
            log.error(error);
          }
          return [];
        },
        async cancelTasks(event, ids) {
          const log = mainLogger.logChunk();
          try {
            log.log("#Cancel Tasks");
            ids.forEach((id) => {
              const name = Tasks.getTask(id)?.name;
              log.log(`task: ${name}-${id}`);
              Tasks.cancel(id);
            });
            return;
          } catch (error) {
            log.error(error);
          }
          return;
        },
        async getPetaImages(event) {
          const log = mainLogger.logChunk();
          try {
            log.log("#Get PetaImages");
            const petaImages = await petaDatas.getPetaImages();
            log.log("return:", true);
            return petaImages;
          } catch(e) {
            log.error(e);
            showError({
              category: "M",
              code: 100,
              title: "Get PetaImages Error",
              message: String(e)
            });
          }
          return {};
        },
        async updatePetaImages(event, datas, mode) {
          return Tasks.spawn("UpdatePetaImages", async (handler) => {
            const log = mainLogger.logChunk();
            log.log("#Update PetaImages");
            try {
              await petaDatas.updatePetaImages(datas, mode);
              log.log("return:", true);
              return true;
            } catch (err) {
              log.error(err);
              showError({
                category: "M",
                code: 200,
                title: "Update PetaImages Error",
                message: String(err)
              });
            }
            return false;
          }, {});
        },
        async getPetaBoards(event) {
          const log = mainLogger.logChunk();
          try {
            log.log("#Get PetaBoards");
            const petaBoards = await petaDatas.getPetaBoards();
            if (petaBoards.length === 0) {
              log.log("no boards! create empty board");
              const board = createPetaBoard(DEFAULT_BOARD_NAME, 0, isDarkMode());
              await petaDatas.updatePetaBoard(board, UpdateMode.UPSERT);
              petaBoards.push(board);
            }
            log.log("return:", petaBoards.length);
            return petaBoards;
          } catch(e) {
            log.error(e);
            showError({
              category: "M",
              code: 100,
              title: "Get PetaBoards Error",
              message: String(e)
            });
          }
          return [];
        },
        async updatePetaBoards(event, boards, mode) {
          const log = mainLogger.logChunk();
          try {
            log.log("#Update PetaBoards");
            await promiseSerial((board) => petaDatas.updatePetaBoard(board, mode), boards).promise;
            log.log("return:", true);
            return true;
          } catch(e) {
            log.error(e);
            showError({
              category: "M",
              code: 200,
              title: "Update PetaBoards Error",
              message: String(e)
            });
          }
          return false;
        },
        async updatePetaTags(event, tags, mode) {
          const log = mainLogger.logChunk();
          try {
            log.log("#Update PetaTags");
            await promiseSerial((tag) => petaDatas.updatePetaTag(tag, mode), tags).promise;
            emitMainEvent("updatePetaTags");
            log.log("return:", true);
            return true;
          } catch (error) {
            log.error(error);
            showError({
              category: "M",
              code: 200,
              title: "Update PetaTags Error",
              message: String(error)
            });
          }
          return false;
        },
        async updatePetaImagesPetaTags(event, petaImageIds, petaTagIds, mode) {
          const log = mainLogger.logChunk();
          try {
            log.log("#Update PetaImagesPetaTags");
            await petaDatas.updatePetaImagesPetaTags(petaImageIds, petaTagIds, mode);
            log.log("return:", true);
            return true;
          } catch(error) {
            log.error(error);
            showError({
              category: "M",
              code: 200,
              title: "Update PetaImagesPetaTags Error",
              message: String(error)
            });
          }
          return false;
        },
        async getPetaImageIdsByPetaTagIds(event, petaTagIds) {
          const log = mainLogger.logChunk();
          try {
            log.log("#Get PetaImageIds By PetaTagIds");
            const ids = await petaDatas.getPetaImageIdsByPetaTagIds(petaTagIds);
            log.log("return:", ids.length);
            return ids;
          } catch(error) {
            log.error(error);
            showError({
              category: "M",
              code: 100,
              title: "Get PetaImageIds By PetaTagIds Error",
              message: String(error)
            });
          }
          return [];
        },
        async getPetaTagIdsByPetaImageIds(event, petaImageIds) {
          const log = mainLogger.logChunk();
          try {
            // log.log("#Get PetaTagIds By PetaImageIds");
            const petaTagIds = await petaDatas.getPetaTagIdsByPetaImageIds(petaImageIds);
            // log.log("return:", petaTagIds.length);
            return petaTagIds;
          } catch(error) {
            log.error(error);
            showError({
              category: "M",
              code: 100,
              title: "Get PetaTagIds By PetaImageIds Error",
              message: String(error)
            });
          }
          return [];
        },
        async getPetaTagInfos() {
          const log = mainLogger.logChunk();
          try {
            log.log("#Get PetaTagInfos");
            const petaTagInfos = await petaDatas.getPetaTagInfos(i18n.global.t("browser.untagged"));
            log.log("return:", petaTagInfos.length);
            return petaTagInfos;
          } catch (error) {
            log.error(error);
            showError({
              category: "M",
              code: 100,
              title: "Get PetaTagInfos Error",
              message: String(error)
            });
          }
          return [];
        },
        async log(event, id: string, ...args: any) {
          dataLogger.log(LogFrom.RENDERER, id, ...args);
          return true;
        },
        async openURL(event, url) {
          const log = mainLogger.logChunk();
          log.log("#Open URL");
          log.log("url:", url);
          shell.openExternal(url);
          return true;
        },
        async openImageFile(event, petaImage) {
          const log = mainLogger.logChunk();
          log.log("#Open Image File");
          shell.showItemInFolder(petaDatas.getImagePath(petaImage, ImageType.ORIGINAL));
        },
        async getAppInfo(event) {
          const log = mainLogger.logChunk();
          log.log("#Get App Info");
          const info = {
            name: app.getName(),
            version: app.getVersion()
          };
          log.log("return:", info);
          return info;
        },
        async showDBFolder(event) {
          const log = mainLogger.logChunk();
          log.log("#Show DB Folder");
          shell.showItemInFolder(DIR_ROOT);
          return true;
        },
        async showConfigFolder(event) {
          const log = mainLogger.logChunk();
          log.log("#Show Config Folder");
          shell.showItemInFolder(DIR_APP);
          return true;
        },
        async showImageInFolder(event, petaImage) {
          const log = mainLogger.logChunk();
          log.log("#Show Image In Folder");
          shell.showItemInFolder(petaDatas.getImagePath(petaImage, ImageType.ORIGINAL));
          return true;
        },
        async updateSettings(event, settings) {
          const log = mainLogger.logChunk();
          try {
            log.log("#Update Settings");
            dataSettings.data = settings;
            Object.keys(windows).forEach((key) => {
              const window = windows[key as WindowType];
              if (window === undefined || window.isDestroyed()) {
                return;
              }
              window.setAlwaysOnTop(dataSettings.data.alwaysOnTop);
            });
            dataSettings.save();
            emitMainEvent("updateSettings", settings);
            emitMainEvent("showNSFW", getShowNSFW());
            emitDarkMode();
            log.log("return:", dataSettings.data);
            return true;
          } catch(e) {
            log.error(e);
            showError({
              category: "M",
              code: 200,
              title: "Update Settings Error",
              message: String(e)
            });
          }
          return false;
        },
        async getSettings(event) {
          const log = mainLogger.logChunk();
          log.log("#Get Settings");
          log.log("return:", dataSettings.data);
          return dataSettings.data;
        },
        async getWindowIsFocused(event) {
          const log = mainLogger.logChunk();
          log.log("#Get Window Is Focused");
          const isFocued = getWindowByEvent(event)?.window.isFocused() ? true : false;
          log.log("return:", isFocued);
          return isFocued;
        },
        async setZoomLevel(event, level) {
          const log = mainLogger.logChunk();
          log.log("#Set Zoom Level");
          log.log("level:", level);
          windows.board?.webContents.setZoomLevel(level);
        },
        async windowMinimize(event) {
          const log = mainLogger.logChunk();
          log.log("#Window Minimize");
          getWindowByEvent(event)?.window.minimize();
        },
        async windowMaximize(event) {
          const log = mainLogger.logChunk();
          log.log("#Window Maximize");
          const window = getWindowByEvent(event);
          if (window?.window.isMaximized()) {
            window?.window.unmaximize();
            return;
          }
          window?.window.maximize();
        },
        async windowClose(event) {
          const log = mainLogger.logChunk();
          log.log("#Window Close");
          const window = getWindowByEvent(event);
          window?.window.close();
        },
        async windowActivate(event) {
          getWindowByEvent(event)?.window.moveTop();
          getWindowByEvent(event)?.window.focus();
        },
        async windowToggleDevTools(event) {
          const log = mainLogger.logChunk();
          log.log("#Toggle Dev Tools");
          getWindowByEvent(event)?.window.webContents.toggleDevTools();
        },
        async getPlatform(event) {
          const log = mainLogger.logChunk();
          log.log("#Get Platform");
          log.log("return:", process.platform);
          return process.platform;
        },
        async regenerateMetadatas(event) {
          const log = mainLogger.logChunk();
          try {
            log.log("#Regenerate Thumbnails");
            await petaDatas.regenerateMetadatas();
            return;
          } catch (err) {
            log.error(err);
            showError({
              category: "M",
              code: 200,
              title: "Regenerate Thumbnails Error",
              message: String(err)
            });
          }
          return;
        },
        async browsePetaImageDirectory(event) {
          const log = mainLogger.logChunk();
          log.log("#Browse PetaImage Directory");
          const window = getWindowByEvent(event);
          if (window) {
            const file = await dialog.showOpenDialog(window.window, {
              properties: ["openDirectory"]
            });
            if (file.canceled) {
              log.log("canceled");
              return null;
            }
            const filePath = file.filePaths[0];
            if (!filePath) {
              return null;
            }
            let path = Path.resolve(filePath);
            if (Path.basename(path) != "PetaImage") {
              path = Path.resolve(path, "PetaImage");
            }
            log.log("return:", path);
            return path;
          }
          return "";
        },
        async changePetaImageDirectory(event, path) {
          const log = mainLogger.logChunk();
          try {
            log.log("#Change PetaImage Directory");
            path = Path.resolve(path);
            if (Path.resolve() === path) {
              log.error("Invalid file path:", path);
              return false;
            }
            if (DIR_APP === path) {
              log.error("Invalid file path:", path);
              return false;
            }
            path = file.initDirectory(true, path);
            dataSettings.data.petaImageDirectory.default = false;
            dataSettings.data.petaImageDirectory.path = path;
            dataSettings.save();
            relaunch();
            return true;
          } catch(error) {
            log.error(error);
          }
          return false;
        },
        async getStates(event) {
          const log = mainLogger.logChunk();
          log.log("#Get States");
          return dataStates.data;
        },
        async waifu2xConvert(event, petaImages) {
          const log = mainLogger.logChunk();
          try {
            log.log("#Waifu2x Convert");
            const result = await petaDatas.waifu2x(petaImages);
            log.log("return:", result);
            return result;
          } catch (error) {
            log.error(error);
          }
          return false;
        },
        async installUpdate(event) {
          const log = mainLogger.logChunk();
          try {
            log.log("#Install Update");
            log.log("path:", updateInstallerFilePath);
            shell.openPath(updateInstallerFilePath);
            return true;
          } catch (error) {
            log.error(error);
          }
          return false;
        },
        async startDrag(event, petaImages, iconSize, iconData) {
          const first = petaImages[0];
          if (!first) {
            return;
          }
          draggingPreviewWindow.createWindow();
          draggingPreviewWindow.setPetaImages(petaImages, dataSettings.data.alwaysShowNSFW);
          draggingPreviewWindow.setSize(iconSize, first.height * iconSize);
          draggingPreviewWindow.setVisible(true);
          dropFromBrowserPetaImageIds = petaImages.map((petaImage) => petaImage.id);
          const files = petaImages.map((petaImage) => Path.resolve(DIR_IMAGES, petaImage.file.original));
          if (windows.board !== undefined && !windows.board.isDestroyed()) {
            windows.board.moveTop();
          }
          draggingPreviewWindow.window?.moveTop();
          event.sender.startDrag({
            file: files[0]!,
            files: files,
            icon: nativeImage.createFromDataURL(Transparent),
          });
          draggingPreviewWindow.setVisible(false);
          draggingPreviewWindow.destroy();
          setTimeout(() => {
            dropFromBrowserPetaImageIds = undefined;
          }, 100);
        },
        async getDropFromBrowserPetaImageIds() {
          if (!dropFromBrowserPetaImageIds) {
            return undefined;
          }
          const ids = [...dropFromBrowserPetaImageIds];
          dropFromBrowserPetaImageIds = undefined;
          draggingPreviewWindow.clearImages();
          draggingPreviewWindow.setVisible(false);
          draggingPreviewWindow.destroy();
          return ids;
        },
        async updateStates(event, states) {
          const log = mainLogger.logChunk();
          try {
            log.log("#Update States");
            dataStates.data = states;
            dataStates.save();
            emitMainEvent("updateStates", states);
            log.log("return:", dataStates.data);
            return true;
          } catch(e) {
            log.error(e);
          }
          return false;
        },
        async importImagesByDragAndDrop(event, htmls, arrayBuffers, filePaths) {
          const log1 = mainLogger.logChunk();
          log1.log("#ImportImagesByDragAndDrop");
          log1.log(htmls.length, arrayBuffers.length, filePaths.length);
          let petaImages: PetaImage[] = [];
          const urls: string[] = [];
          const log2 = mainLogger.logChunk();
          try {
            htmls.map((html) => {
              try {
                urls.push(getURLFromImgTag(html));
              } catch (error) {
                //
                log2.error("invalid html", error);
              }
            });
            log2.log("1.trying to download:", urls);
            const datas = await promiseSerial(
              async (url) => {
                let data: Buffer;
                let remoteURL = "";
                if (url.trim().indexOf("data:") === 0) {
                  // dataURIだったら
                  data = dataURIToBuffer(url);
                } else {
                  // 普通のurlだったら
                  data = (await axios.get(url, { responseType: "arraybuffer" })).data;
                  remoteURL = url;
                }
                return {
                  buffer: data,
                  note: remoteURL,
                  name: "downloaded"
                };
              },
              urls
            ).promise;
            if (datas.length > 0) {
              petaImages = await petaDatas.importImagesFromBuffers(datas);
              log2.log("result:", petaImages.length);
            }
          } catch (error) {
            log2.error(error);
          }
          const log3 = mainLogger.logChunk();
          try {
            if (petaImages.length === 0) {
              if (arrayBuffers.length > 0) {
                log3.log("2.trying to read ArrayBuffer:", arrayBuffers.length);
                petaImages = await petaDatas.importImagesFromBuffers(
                  arrayBuffers.map((ab) => {
                    return {
                      buffer: Buffer.from(ab),
                      name: urls.length > 0 ? "downloaded" : "noname",
                      note: urls.length > 0 ? urls[0]! : ""
                    };
                  })
                );
                log3.log("result:", petaImages.length);
              }
            }
          } catch (error) {
            log3.error(error);
          }
          const log4 = mainLogger.logChunk();
          try {
            if (petaImages.length === 0) {
              log4.log("3.trying to read filePath:", filePaths.length);
              petaImages = await petaDatas.importImagesFromFilePaths(filePaths);
              log4.log("result:", petaImages.length);
            }
          } catch (error) {
            log4.error(error);
          }
          log1.log("return:", petaImages.length);
          return petaImages.map((petaImage) => petaImage.id);
        },
        async openWindow(event, windowType) {
          if (windows[windowType] === undefined || windows[windowType]?.isDestroyed()) {
            switch (windowType) {
              case WindowType.BOARD:
                windows[windowType] = initBoardWindow();
                break;
              case WindowType.BROWSER:
                windows[windowType] = initBrowserWindow();
                break;
              case WindowType.SETTINGS:
                windows[windowType] = initSettingsWindow();
                break;
              case WindowType.DETAILS:
                windows[windowType] = initDetailsWindow();
                break;
            }
          } else {
            windows[windowType]?.moveTop();
            windows[windowType]?.focus();
          }
          moveSettingsWindowToTop();
        },
        async getMainWindowType() {
          return mainWindowType;
        },
        async getShowNSFW() {
          return getShowNSFW();
        },
        async setShowNSFW(event, value) {
          temporaryShowNSFW = value;
          emitMainEvent("showNSFW", getShowNSFW());
        },
        async searchImageByGoogle(event, petaImage) {
          const log = mainLogger.logChunk();
          log.log("#Search Image By Google");
          try {
            await searchImageByGoogle(petaImage);
            log.log("return:", true);
            return true;
          } catch (error) {
            log.error(error);
          }
          return false;
        },
        async setDetailsPetaImage(event, petaImage: PetaImage) {
          detailsPetaImage = petaImage;
          emitMainEvent("detailsPetaImage", detailsPetaImage);
          return;
        },
        async getDetailsPetaImage() {
          return detailsPetaImage;
        },
        async getIsDarkMode() {
          return isDarkMode();
        }
      }
    }
  });
  //-------------------------------------------------------------------------------------------------//
  /*
    色々な関数
  */
  //-------------------------------------------------------------------------------------------------//
  function showError(error: ErrorWindowParameters, quit = true) {
    try {
      mainLogger.logChunk().log("$Show Error", `code:${error.code}\ntitle: ${error.title}\nversion: ${app.getVersion()}\nmessage: ${error.message}`);
    } catch { }
    try {
      Object.values(windows).forEach((window) => {
        if (window !== undefined && !window.isDestroyed()) {
          window.loadURL("about:blank");
        }
      });
    } catch { }
    showErrorWindow(error, quit);
  }
  function emitMainEvent<U extends keyof MainEvents>(key: U, ...args: Parameters<MainEvents[U]>): void {
    Object.values(windows).forEach((window) => {
      if (window !== undefined && !window.isDestroyed()) {
        window.webContents.send(key, ...args);
      }
    });
  }
  function closeWindow(type: WindowType) {
    mainLogger.logChunk().log("$Close Window:", type);
    saveWindowSize(type);
    activeWindows[type] = false;
    if (activeWindows.board) {
      changeMainWindow(WindowType.BOARD);
    } else if (activeWindows.browser) {
      changeMainWindow(WindowType.BROWSER);
    } else if (activeWindows.details) {
      changeMainWindow(WindowType.DETAILS);
    } else {
      if (process.platform !== "darwin") {
        app.quit();
      }
    }
  }
  function showWindows() {
    if (dataSettings.data.show === "both") {
      windows.board = initBoardWindow();
      windows.browser = initBrowserWindow();
    } else if (dataSettings.data.show === "browser") {
      windows.browser = initBrowserWindow();
    } else {
      windows.board = initBoardWindow();
    }
  }
  function createWindow(type: WindowType, options: Electron.BrowserWindowConstructorOptions) {
    const window = new BrowserWindow({
      minWidth: WINDOW_MIN_WIDTH,
      minHeight: WINDOW_MIN_HEIGHT,
      frame: false,
      titleBarStyle: "hiddenInset",
      show: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: Path.join(__dirname, "preload.js")
      },
      backgroundColor: isDarkMode() ? BOARD_DARK_BACKGROUND_FILL_COLOR : BOARD_DEFAULT_BACKGROUND_FILL_COLOR,
      ...options,
    });
    activeWindows[type] = true;
    const state = dataWindowStates.data[type];
    mainLogger.logChunk().log("$Create Window:", type);
    window.setMenuBarVisibility(false);
    if (state.maximized) {
      window.maximize();
    }
    window.on("close", () => {
      closeWindow(type);
    });
    window.addListener("blur", () => {
      emitMainEvent("windowFocused", false, type);
    });
    window.addListener("focus", () => {
      emitMainEvent("windowFocused", true, type);
      if (type === WindowType.BOARD || type === WindowType.BROWSER || type === WindowType.DETAILS) {
        changeMainWindow(type);
      }
      window.moveTop();
    });
    if (process.env.WEBPACK_DEV_SERVER_URL) {
      window.loadURL(`${process.env.WEBPACK_DEV_SERVER_URL}?${type}`).then(() => {
        if (!process.env.IS_TEST) {
          // window.webContents.openDevTools({ mode: "right" });
        }
      })
    } else {
      window.loadURL(`app://./index.html?${type}`);
    }
    return window;
  }
  function changeMainWindow(type: WindowType) {
    mainWindowType = type;
    emitMainEvent("mainWindowType", type);
    moveSettingsWindowToTop();
  }
  function moveSettingsWindowToTop() {
    if (mainWindowType) {
      const mainWindow = windows[mainWindowType];
      if (
        mainWindow  !== undefined
        && !mainWindow.isDestroyed()
        && windows.settings !== undefined
        && !windows.settings.isDestroyed()
      ) {
        windows.settings.setParentWindow(mainWindow);
      }
    }
  }
  function initBrowserWindow() {
    return createWindow(WindowType.BROWSER, {
      width: dataWindowStates.data.browser.width,
      height: dataWindowStates.data.browser.height,
      trafficLightPosition: {
        x: 8,
        y: 8
      },
      alwaysOnTop: dataSettings.data.alwaysOnTop
    });
  }
  function initSettingsWindow() {
    return createWindow(WindowType.SETTINGS, {
      width: WINDOW_SETTINGS_WIDTH,
      height: WINDOW_SETTINGS_HEIGHT,
      minWidth: WINDOW_SETTINGS_WIDTH,
      minHeight: WINDOW_SETTINGS_HEIGHT,
      maximizable: false,
      minimizable: false,
      trafficLightPosition: {
        x: 8,
        y: 8
      },
      alwaysOnTop: dataSettings.data.alwaysOnTop
    });
  }
  function initBoardWindow() {
    return createWindow(WindowType.BOARD, {
      width: dataWindowStates.data.board.width,
      height: dataWindowStates.data.board.height,
      trafficLightPosition: {
        x: 13,
        y: 13
      },
      alwaysOnTop: dataSettings.data.alwaysOnTop
    });
  }
  function initDetailsWindow() {
    return createWindow(WindowType.DETAILS, {
      width: dataWindowStates.data.details.width,
      height: dataWindowStates.data.details.height,
      trafficLightPosition: {
        x: 8,
        y: 8
      },
      alwaysOnTop: dataSettings.data.alwaysOnTop
    });
  }
  async function searchImageByGoogle(petaImage: PetaImage) {
    return Tasks.spawn("Search Image By Google", async (handler, petaImage: PetaImage) => {
      handler.emitStatus({
        i18nKey: "tasks.searchImageByGoogle",
        progress: {
          all: 3,
          current: 0
        },
        log: [],
        status: "begin",
        cancelable: false
      });
      const imageFilePath = Path.resolve(DIR_THUMBNAILS, petaImage.file.thumbnail);
      const window = new BrowserWindow({
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          offscreen: true
        },
      });
      try {
        await window.loadURL(SEARCH_IMAGE_BY_GOOGLE_URL);
        handler.emitStatus({
          i18nKey: "tasks.searchImageByGoogle",
          progress: {
            all: 3,
            current: 1
          },
          log: [`loaded: ${SEARCH_IMAGE_BY_GOOGLE_URL}`],
          status: "progress",
          cancelable: false
        });
        await new Promise((res) => {
          setTimeout(res, 1000);
        });
        window.webContents.debugger.attach("1.1");
        const document = await window.webContents.debugger.sendCommand("DOM.getDocument", {});
        const input = await window.webContents.debugger.sendCommand("DOM.querySelector", {
          nodeId: document.root.nodeId,
          selector: "input[name=encoded_image]"
        });
        await window.webContents.debugger.sendCommand("DOM.setFileInputFiles", {
          nodeId: input.nodeId,
          files: [imageFilePath]
        });
        handler.emitStatus({
          i18nKey: "tasks.searchImageByGoogle",
          progress: {
            all: 3,
            current: 2
          },
          log: [`uploading: ${SEARCH_IMAGE_BY_GOOGLE_URL}`],
          status: "progress",
          cancelable: false
        });
        await new Promise((res, rej) => {
          const timeoutHandler = setTimeout(() => {
            rej("timeout");
          }, SEARCH_IMAGE_BY_GOOGLE_TIMEOUT);
          window.webContents.addListener("did-finish-load", () => {
            shell.openExternal(window.webContents.getURL());
            clearTimeout(timeoutHandler);
            handler.emitStatus({
              i18nKey: "tasks.searchImageByGoogle",
              progress: {
                all: 3,
                current: 3
              },
              log: [`uploaded: ${SEARCH_IMAGE_BY_GOOGLE_URL}`],
              status: "complete",
              cancelable: false
            });
            res(true);
          });
        });
      } catch (error) {
        window.destroy();
        handler.emitStatus({
          i18nKey: "tasks.searchImageByGoogle",
          progress: {
            all: 3,
            current: 3
          },
          log: [],
          status: "failed",
          cancelable: false
        });
        throw error;
      }
      window.destroy();
      return true;
    }, petaImage);
  }
  function saveWindowSize(windowType: WindowType) {
    mainLogger.logChunk().log("$Save Window States:", windowType);
    const state = dataWindowStates.data[windowType];
    const window = windows[windowType];
    if (window === undefined || window.isDestroyed()) {
      return;
    }
    if (!window.isMaximized()) {
      state.width = window.getSize()[0] || WINDOW_DEFAULT_WIDTH;
      state.height = window.getSize()[1] || WINDOW_DEFAULT_HEIGHT;
    }
    state.maximized = window.isMaximized();
    dataWindowStates.save();
  }
  async function getLatestVersion(): Promise<RemoteBinaryInfo> {
    const log = mainLogger.logChunk();
    try {
      const url = `${PACKAGE_JSON_URL}?hash=${uuid()}`;
      const packageJSON = (await axios.get(url, { responseType: "json" })).data;
      return {
        version: packageJSON.version,
        sha256: {
          win: packageJSON["binary-sha256-win"],
          mac: packageJSON["binary-sha256-mac"],
        }
      }
    } catch(e) {
      log.error(e);
    }
    return {
      version: app.getVersion(),
      sha256: {
        win: "",
        mac: "",
      }
    }
  }
  async function checkUpdate() {
    if (checkUpdateTimeoutHandler) {
      clearTimeout(checkUpdateTimeoutHandler);
    }
    if (process.platform != "win32") {
      return;
    }
    const log = mainLogger.logChunk();
    log.log("$Check Update");
    const remote: RemoteBinaryInfo = await getLatestVersion();
    const needToUpdate = !isLatest(app.getVersion(), remote.version, dataSettings.data.ignoreMinorUpdate);
    log.log(remote, needToUpdate);
    if (needToUpdate) {
      log.log("this version is old");
      // prepareUpdate(remote);
      emitMainEvent("notifyUpdate", remote.version, false);
    } else {
      log.log("this version is latest");
    }
    checkUpdateTimeoutHandler = setTimeout(checkUpdate, UPDATE_CHECK_INTERVAL);
  }
  function isDarkMode() {
    if (dataSettings.data.autoDarkMode) {
      return nativeTheme.shouldUseDarkColors;
    }
    return dataSettings.data.darkMode;
  }
  function emitDarkMode() {
    emitMainEvent("darkMode", isDarkMode());
  }
  function getWindowByEvent(event: IpcMainInvokeEvent) {
    const windowSet = Object.keys(windows).map((key) => {
      return {
        type: key as WindowType,
        window: windows[key as WindowType]
      }
    }).find((window) => {
      return window.window && !window.window.isDestroyed() && window.window.webContents.mainFrame === event.sender.mainFrame
    });
    if (windowSet && windowSet.window !== undefined) {
      return windowSet as {
        type: WindowType,
        window: BrowserWindow
      };
    }
    return undefined;
  }
  function getShowNSFW() {
    return temporaryShowNSFW || dataSettings.data.alwaysShowNSFW;
  }
  function relaunch() {
    app.relaunch();
    app.exit();
  }
})();