import { app, ipcMain, dialog, IpcMainInvokeEvent, shell, session, protocol, nativeImage, nativeTheme } from "electron";
import * as Path from "path";
import axios from "axios";
import { v4 as uuid } from "uuid";
import { createProtocol } from "vue-cli-plugin-electron-builder/lib";
import { createI18n } from "vue-i18n";
import languages from "@/commons/languages";
import { DEFAULT_BOARD_NAME, PACKAGE_JSON_URL, UPDATE_CHECK_INTERVAL } from "@/commons/defines";
import * as file from "@/mainProcess/storages/file";
import DB from "@/mainProcess/storages/db";
import { Logger, LogFrom } from "@/mainProcess/storages/logger";
import Config from "@/mainProcess/storages/config";
import { PetaImage, PetaImages } from "@/commons/datas/petaImage";
import { createPetaBoard, PetaBoard } from "@/commons/datas/petaBoard";
import { UpdateMode } from "@/commons/api/interfaces/updateMode";
import { Settings, getDefaultSettings } from "@/commons/datas/settings";
import { MainFunctions } from "@/commons/api/mainFunctions";
import { ImageType } from "@/commons/datas/imageType";
import { defaultStates, States } from "@/commons/datas/states";
import { upgradePetaImage, upgradePetaTag, upgradePetaImagesPetaTags, upgradeSettings, upgradeStates, upgradeWindowStates } from "@/mainProcess/utils/upgrader";
import { arrLast } from "@/commons/utils/utils";
import isValidFilePath from "@/mainProcess/utils/isValidFilePath";
import { promiseSerial } from "@/commons/utils/promiseSerial";
import { PetaTag } from "@/commons/datas/petaTag";
import { PetaImagePetaTag } from "@/commons/datas/petaImagesPetaTags";
import { MainLogger } from "@/mainProcess/utils/mainLogger";
import { showErrorWindow, ErrorWindowParameters } from "@/mainProcess/errors/errorWindow";
import { PetaDatas } from "@/mainProcess/petaDatas";
import * as Tasks from "@/mainProcess/tasks/task";
import { getLatestVersion } from "@/commons/utils/versions";
import { RemoteBinaryInfo } from "@/commons/datas/remoteBinaryInfo";
import Transparent from "@/@assets/transparent.png";
import { DraggingPreviewWindow } from "./draggingPreviewWindow/draggingPreviewWindow";
import { WindowType } from "@/commons/datas/windowType";
import { defaultWindowStates, WindowStates } from "@/commons/datas/windowStates";
import { searchImageByGoogle } from "./utils/searchImageByGoogle";
import { Windows } from "./utils/windows";
(() => {
  /*------------------------------------
    シングルインスタンス化
  ------------------------------------*/
  if (!app.requestSingleInstanceLock()) {
    app.quit();
    return;
  }
  //-------------------------------------------------------------------------------------------------//
  /*
    window, ファイルパス, DBの定義
  */
  //-------------------------------------------------------------------------------------------------//
  const mainLogger = new MainLogger();
  const draggingPreviewWindow = new DraggingPreviewWindow();
  const i18n = createI18n({
    locale: "ja",
    messages: languages,
  });
  let temporaryShowNSFW = false;
  let isDataInitialized = false;
  let detailsPetaImage: PetaImage | undefined;
  let checkUpdateTimeoutHandler: NodeJS.Timeout | undefined;
  let dropFromBrowserPetaImageIds: string[] | undefined;
  //-------------------------------------------------------------------------------------------------//
  /*
    ファイルパスとDBの、検証・読み込み・作成
  */
  //-------------------------------------------------------------------------------------------------//
  const constants = getConstants();
  if (constants === undefined) {
    return;
  }
  const {
    DIR_APP,
    DIR_ROOT,
    DIR_IMAGES,
    DIR_THUMBNAILS,
    dataLogger,
    dbPetaImages,
    dbPetaBoard,
    dbPetaTags,
    dbPetaImagesPetaTags,
    configSettings,
    configStates,
    petaDatas,
    windows
  } = constants;
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
      (windows.windows.board === undefined || windows.windows.board.isDestroyed())
      && (windows.windows.browser === undefined || windows.windows.browser.isDestroyed())
    ) {
      windows.showWindows();
    }
  });
  app.on("before-quit", (event) => {
    draggingPreviewWindow.destroy();
  });
  app.on("window-all-closed", () => {
    //
  });
  app.on("second-instance", () => {
    const count = Object.values(windows.windows).filter((window) => {
      return window !== undefined && !window.isDestroyed();
    }).map((window) => {
      window?.focus();
    }).length;
    if (count < 1) {
      windows.showWindows();
    }
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
    windows.showWindows();
    //-------------------------------------------------------------------------------------------------//
    /*
      データベースのロード
    */
    //-------------------------------------------------------------------------------------------------//
    try {
      // 時間かかったときのテスト
      // await new Promise((res) => setTimeout(res, 5000));
      await Promise.all([
        dbPetaBoard.init(),
        dbPetaImages.init(),
        dbPetaTags.init(),
        dbPetaImagesPetaTags.init()
      ]);
      await dbPetaTags.ensureIndex({
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
    isDataInitialized = true;
    windows.emitMainEvent("dataInitialized");
    //-------------------------------------------------------------------------------------------------//
    /*
      データのマイグレーション
    */
    //-------------------------------------------------------------------------------------------------//
    try {
      const petaImagesArray = await dbPetaImages.find({});
      const petaImages: PetaImages = {};
      petaImagesArray.forEach((pi) => {
        petaImages[pi.id] = upgradePetaImage(pi);
      });
      if (await upgradePetaTag(dbPetaTags, petaImages)) {
        mainLogger.logChunk().log("Upgrade Tags");
        await promiseSerial((pi) => petaDatas.updatePetaImage(pi, UpdateMode.UPDATE), petaImagesArray).promise;
      }
      if (await upgradePetaImagesPetaTags(dbPetaTags, dbPetaImagesPetaTags, petaImages)) {
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
          const window = windows.getWindowByEvent(event);
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
          const window = windows.getWindowByEvent(event);
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
            windows.emitMainEvent("updatePetaTags");
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
            configSettings.data = settings;
            Object.keys(windows).forEach((key) => {
              const window = windows.windows[key as WindowType];
              if (window === undefined || window.isDestroyed()) {
                return;
              }
              window.setAlwaysOnTop(configSettings.data.alwaysOnTop);
            });
            configSettings.save();
            windows.emitMainEvent("updateSettings", settings);
            windows.emitMainEvent("showNSFW", getShowNSFW());
            emitDarkMode();
            log.log("return:", configSettings.data);
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
          log.log("return:", configSettings.data);
          return configSettings.data;
        },
        async getWindowIsFocused(event) {
          const log = mainLogger.logChunk();
          log.log("#Get Window Is Focused");
          const isFocued = windows.getWindowByEvent(event)?.window.isFocused() ? true : false;
          log.log("return:", isFocued);
          return isFocued;
        },
        async setZoomLevel(event, level) {
          const log = mainLogger.logChunk();
          log.log("#Set Zoom Level");
          log.log("level:", level);
          windows.windows.board?.webContents.setZoomLevel(level);
        },
        async windowMinimize(event) {
          const log = mainLogger.logChunk();
          log.log("#Window Minimize");
          windows.getWindowByEvent(event)?.window.minimize();
        },
        async windowMaximize(event) {
          const log = mainLogger.logChunk();
          log.log("#Window Maximize");
          const window = windows.getWindowByEvent(event);
          if (window?.window.isMaximized()) {
            window?.window.unmaximize();
            return;
          }
          window?.window.maximize();
        },
        async windowClose(event) {
          const log = mainLogger.logChunk();
          log.log("#Window Close");
          const window = windows.getWindowByEvent(event);
          window?.window.close();
        },
        async windowActivate(event) {
          windows.getWindowByEvent(event)?.window.moveTop();
          windows.getWindowByEvent(event)?.window.focus();
        },
        async windowToggleDevTools(event) {
          const log = mainLogger.logChunk();
          log.log("#Toggle Dev Tools");
          windows.getWindowByEvent(event)?.window.webContents.toggleDevTools();
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
          const window = windows.getWindowByEvent(event);
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
            configSettings.data.petaImageDirectory.default = false;
            configSettings.data.petaImageDirectory.path = path;
            configSettings.save();
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
          return configStates.data;
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
          // 
          return false;
        },
        async startDrag(event, petaImages, iconSize, iconData) {
          const first = petaImages[0];
          if (!first) {
            return;
          }
          draggingPreviewWindow.createWindow();
          draggingPreviewWindow.setPetaImages(petaImages, configSettings.data.alwaysShowNSFW);
          draggingPreviewWindow.setSize(iconSize, first.height * iconSize);
          draggingPreviewWindow.setVisible(true);
          dropFromBrowserPetaImageIds = petaImages.map((petaImage) => petaImage.id);
          const files = petaImages.map((petaImage) => Path.resolve(DIR_IMAGES, petaImage.file.original));
          if (windows.windows.board !== undefined && !windows.windows.board.isDestroyed()) {
            windows.windows.board.moveTop();
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
            configStates.data = states;
            configStates.save();
            windows.emitMainEvent("updateStates", states);
            log.log("return:", configStates.data);
            return true;
          } catch(e) {
            log.error(e);
          }
          return false;
        },
        async importImagesByDragAndDrop(event, htmls, arrayBuffers, filePaths) {
          const log = mainLogger.logChunk();
          try {
            log.log("#ImportImagesByDragAndDrop");
            log.log(htmls.length, arrayBuffers.length, filePaths.length);
            const petaImages = await petaDatas.importImagesByDragAndDrop(htmls, arrayBuffers, filePaths);
            log.log("return:", petaImages.length);
            return petaImages;
          } catch (e) {
            log.error(e);
          }
          return [];
        },
        async openWindow(event, windowType) {
          windows.openWindow(event, windowType);
        },
        async getMainWindowType() {
          return windows.mainWindowType;
        },
        async getShowNSFW() {
          return getShowNSFW();
        },
        async setShowNSFW(event, value) {
          temporaryShowNSFW = value;
          windows.emitMainEvent("showNSFW", getShowNSFW());
        },
        async searchImageByGoogle(event, petaImage) {
          const log = mainLogger.logChunk();
          log.log("#Search Image By Google");
          try {
            await searchImageByGoogle(petaImage, DIR_THUMBNAILS);
            log.log("return:", true);
            return true;
          } catch (error) {
            log.error(error);
          }
          return false;
        },
        async setDetailsPetaImage(event, petaImage: PetaImage) {
          detailsPetaImage = petaImage;
          windows.emitMainEvent("detailsPetaImage", detailsPetaImage);
          return;
        },
        async getDetailsPetaImage() {
          return detailsPetaImage;
        },
        async getIsDarkMode() {
          return isDarkMode();
        },
        async getIsDataInitialized() {
          return isDataInitialized;
        },
        async getLatestVersion() {
          return getLatestVersion(configSettings.data.ignoreMinorUpdate);
        }
      }
    }
  });
  //-------------------------------------------------------------------------------------------------//
  /*
    色々な関数
  */
  //-------------------------------------------------------------------------------------------------//
  function getConstants() {
    const dirs = {
      DIR_ROOT: "",
      DIR_APP: "",
      DIR_LOG: "",
      DIR_IMAGES: "",
      DIR_THUMBNAILS: "",
      DIR_TEMP: ""
    }
    const files = {
      FILE_IMAGES_DB: "",
      FILE_BOARDS_DB: "",
      FILE_TAGS_DB: "",
      FILE_IMAGES_TAGS_DB: "",
      FILE_SETTINGS: "",
      FILE_STATES: "",
      FILE_WINDOW_STATES: ""
    }
    let dataLogger: Logger;
    let dbPetaImages: DB<PetaImage>;
    let dbPetaBoard: DB<PetaBoard>;
    let dbPetaTags: DB<PetaTag>;
    let dbPetaImagesPetaTags: DB<PetaImagePetaTag>;
    let configSettings: Config<Settings>;
    let configStates: Config<States>;
    let configWindowStates: Config<WindowStates>;
    let petaDatas: PetaDatas;
    let windows: Windows;
    try {
      // ログは最優先で初期化
      dirs.DIR_LOG = file.initDirectory(false, app.getPath("logs"));
      dataLogger = new Logger(dirs.DIR_LOG);
      mainLogger.logger = dataLogger;
      // その他の初期化
      dirs.DIR_APP = file.initDirectory(false, app.getPath("userData"));
      dirs.DIR_TEMP = file.initDirectory(true, app.getPath("temp"), `imagePetaPeta-beta${uuid()}`);
      files.FILE_SETTINGS = file.initFile(dirs.DIR_APP, "settings.json");
      configSettings = new Config<Settings>(files.FILE_SETTINGS, getDefaultSettings(), upgradeSettings);
      if (configSettings.data.petaImageDirectory.default) {
        dirs.DIR_ROOT = file.initDirectory(true, app.getPath("pictures"), "imagePetaPeta");
        configSettings.data.petaImageDirectory.path = dirs.DIR_ROOT;
      } else {
        try {
          if (!isValidFilePath(configSettings.data.petaImageDirectory.path)) {
            throw new Error();
          }
          dirs.DIR_ROOT = file.initDirectory(true, configSettings.data.petaImageDirectory.path);
        } catch (error) {
          configSettings.data.petaImageDirectory.default = true;
          configSettings.save();
          throw new Error(`Cannot access PetaImage directory: "${configSettings.data.petaImageDirectory.path}"\nChanged to default directory. Please restart application.`);
        }
      }
      dirs.DIR_IMAGES = file.initDirectory(true, dirs.DIR_ROOT, "images");
      dirs.DIR_THUMBNAILS = file.initDirectory(true, dirs.DIR_ROOT, "thumbnails");
      files.FILE_IMAGES_DB = file.initFile(dirs.DIR_ROOT, "images.db");
      files.FILE_BOARDS_DB = file.initFile(dirs.DIR_ROOT, "boards.db");
      files.FILE_TAGS_DB = file.initFile(dirs.DIR_ROOT, "tags.db");
      files.FILE_IMAGES_TAGS_DB = file.initFile(dirs.DIR_ROOT, "images_tags.db");
      files.FILE_STATES = file.initFile(dirs.DIR_APP, "states.json");
      files.FILE_WINDOW_STATES = file.initFile(dirs.DIR_APP, "windowStates.json");
      dbPetaImages = new DB<PetaImage>("petaImages", files.FILE_IMAGES_DB);
      dbPetaBoard = new DB<PetaBoard>("petaBoards", files.FILE_BOARDS_DB);
      dbPetaTags = new DB<PetaTag>("petaTags", files.FILE_TAGS_DB);
      dbPetaImagesPetaTags = new DB<PetaImagePetaTag>("petaImagePetaTag", files.FILE_IMAGES_TAGS_DB);
      configStates = new Config<States>(files.FILE_STATES, defaultStates, upgradeStates);
      configWindowStates = new Config<WindowStates>(files.FILE_WINDOW_STATES, defaultWindowStates, upgradeWindowStates);
      ([dbPetaImages, dbPetaBoard, dbPetaTags, dbPetaImagesPetaTags] as DB<any>[]).forEach((db) => {
        db.on("beginCompaction", () => {
          mainLogger.logChunk().log(`begin compaction(${db.name})`);
        });
        db.on("doneCompaction", () => {
          mainLogger.logChunk().log(`done compaction(${db.name})`);
        });
        db.on("compactionError", (error) => {
          mainLogger.logChunk().error(`compaction error(${db.name})`, error);
        })
      });
      windows = new Windows(mainLogger, configSettings, configWindowStates, isDarkMode);
      Tasks.onEmitStatus((id, status) => {
        windows.emitMainEvent("taskStatus", id, status);
      });
      petaDatas = new PetaDatas(
        {
          dbPetaBoard,
          dbPetaImages,
          dbPetaImagesPetaTags,
          dbPetaTags,
          configSettings
        }, 
        dirs, 
        windows.emitMainEvent,
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
      return undefined;
    }
    return {
      ...dirs,
      ...files,
      dataLogger,
      dbPetaImages,
      dbPetaBoard,
      dbPetaTags,
      dbPetaImagesPetaTags,
      configSettings,
      configStates,
      configWindowStates,
      petaDatas,
      windows
    }
  }
  function showError(error: ErrorWindowParameters, quit = true) {
    try {
      mainLogger.logChunk().log("$Show Error", `code:${error.code}\ntitle: ${error.title}\nversion: ${app.getVersion()}\nmessage: ${error.message}`);
    } catch { }
    try {
      Object.values(windows.windows).forEach((window) => {
        if (window !== undefined && !window.isDestroyed()) {
          window.loadURL("about:blank");
        }
      });
    } catch { }
    showErrorWindow(error, quit);
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
    const remote: RemoteBinaryInfo = await getLatestVersion(configSettings.data.ignoreMinorUpdate);
    log.log(remote);
    if (!remote.isLatest) {
      log.log("this version is old");
      if (windows.windows.settings === undefined || windows.windows.settings.isDestroyed()) {
        windows.windows.settings = windows.initSettingsWindow(0, 0, true);
      }
      windows.moveSettingsWindowToTop();
      windows.emitMainEvent("foundLatestVersion", remote);
    } else {
      log.log("this version is latest");
    }
    checkUpdateTimeoutHandler = setTimeout(checkUpdate, UPDATE_CHECK_INTERVAL);
  }
  function isDarkMode() {
    if (configSettings.data.autoDarkMode) {
      return nativeTheme.shouldUseDarkColors;
    }
    return configSettings.data.darkMode;
  }
  function emitDarkMode() {
    windows.emitMainEvent("darkMode", isDarkMode());
  }
  function getShowNSFW() {
    return temporaryShowNSFW || configSettings.data.alwaysShowNSFW;
  }
  function relaunch() {
    app.relaunch();
    app.exit();
  }
})();