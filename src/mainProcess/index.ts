import { app, ipcMain, dialog, IpcMainInvokeEvent, shell, session, protocol, BrowserWindow, nativeImage, Tray, Menu, screen } from "electron";
import * as Path from "path";
import axios from "axios";
import dataURIToBuffer from "data-uri-to-buffer";
import { v4 as uuid } from "uuid";
import { createProtocol } from "vue-cli-plugin-electron-builder/lib";
import { createI18n } from "vue-i18n";
import languages from "@/commons/languages";
import { PACKAGE_JSON_URL, UPDATE_CHECK_INTERVAL, WINDOW_DEFAULT_HEIGHT, WINDOW_DEFAULT_WIDTH, WINDOW_MIN_HEIGHT, WINDOW_MIN_WIDTH } from "@/commons/defines";
import * as file from "@/mainProcess/storages/file";
import DB from "@/mainProcess/storages/db";
import { Logger, LogFrom } from "@/mainProcess/storages/logger";
import Config from "@/mainProcess/storages/config";
import { PetaImage, PetaImages } from "@/commons/datas/petaImage";
import { PetaBoard } from "@/commons/datas/petaBoard";
import { UpdateMode } from "@/commons/api/interfaces/updateMode";
import { Settings, getDefaultSettings } from "@/commons/datas/settings";
import { MainEvents } from "@/commons/api/mainEvents";
import { MainFunctions } from "@/commons/api/mainFunctions";
import { ImageType } from "@/commons/datas/imageType";
import { defaultStates, States } from "@/commons/datas/states";
import { upgradePetaImage, upgradePetaTag, upgradePetaImagesPetaTags, upgradeSettings, upgradeStates } from "@/mainProcess/utils/upgrader";
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
  let mainWindow: BrowserWindow;
  let draggingPreviewWindow: DraggingPreviewWindow;
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
  let dataLogger: Logger;
  let dataPetaImages: DB<PetaImage>;
  let dataPetaBoards: DB<PetaBoard>;
  let dataPetaTags: DB<PetaTag>;
  let dataPetaImagesPetaTags: DB<PetaImagePetaTag>;
  let dataSettings: Config<Settings>;
  let dataStates: Config<States>;
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
    dataPetaImages = new DB<PetaImage>("petaImages", FILE_IMAGES_DB);
    dataPetaBoards = new DB<PetaBoard>("petaBoards", FILE_BOARDS_DB);
    dataPetaTags = new DB<PetaTag>("petaTags", FILE_TAGS_DB);
    dataPetaImagesPetaTags = new DB<PetaImagePetaTag>("petaImagePetaTag", FILE_IMAGES_TAGS_DB);
    dataStates = new Config<States>(FILE_STATES, defaultStates, upgradeStates);
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
    mainLogger.logChunk().log("#Electron event: activate");
    if (BrowserWindow.getAllWindows().length < 2) {
      mainWindow = initWindow();
    }
  });
  app.on("before-quit", () => {
    draggingPreviewWindow.destroy();
  })
  //-------------------------------------------------------------------------------------------------//
  /*
    electronのready
  */
  //-------------------------------------------------------------------------------------------------//
  app.on("ready", async () => {
    // console.log(__dirname);
    // const tray = new Tray(nativeImage.createFromDataURL(AppIcon));
    // tray.setToolTip(app.getName());
    // tray.setContextMenu(Menu.buildFromTemplate([
    //   { label: 'Item1', type: 'radio' },
    //   { label: 'Item2', type: 'radio' },
    //   { label: 'Item3', type: 'radio', checked: true },
    //   { label: 'Item4', type: 'radio' }
    // ]));
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
    mainWindow = initWindow();
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
        showMainWindow: async () => {
          checkUpdate();
        },
        importImageFiles: async () => {
          const log = mainLogger.logChunk();
          log.log("#Browse Image Files");
          const result = await dialog.showOpenDialog(mainWindow, {
            properties: ["openFile", "multiSelections"]
          });
          if (result.canceled) {
            log.log("canceled");
            return 0;
          }
          log.log("return:", result.filePaths.length);
          petaDatas.importImagesFromFilePaths(result.filePaths);
          return result.filePaths.length;
        },
        importImageDirectories: async () => {
          const log = mainLogger.logChunk();
          log.log("#Browse Image Directories");
          const result = await dialog.showOpenDialog(mainWindow, {
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
        },
        importImagesFromClipboard: async (event, buffers) => {
          const log = mainLogger.logChunk();
          try {
            log.log("#Import Images From Clipboard");
            return (await petaDatas.importImagesFromBuffers(buffers, "clipboard")).map((petaImage) => petaImage.id);
          } catch (error) {
            log.error(error);
          }
          return [];
        },
        cancelTasks: async (event, ids) => {
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
        getPetaImages: async (event) => {
          const log = mainLogger.logChunk();
          try {
            log.log("#Get PetaImages");
            const petaImages = await petaDatas.getPetaImages();
            log.log("return:", petaImages.length);
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
        updatePetaImages: async (event, datas, mode) => {
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
        getPetaBoards: async (event) => {
          const log = mainLogger.logChunk();
          try {
            log.log("#Get PetaBoards");
            const petaBoards = await petaDatas.getPetaBoards();
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
        updatePetaBoards: async (event, boards, mode) => {
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
        updatePetaTags: async (event, tags, mode) => {
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
        updatePetaImagesPetaTags: async (event, petaImageIds, petaTagIds, mode) => {
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
        getPetaImageIdsByPetaTagIds: async (event, petaTagIds) => {
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
        getPetaTagIdsByPetaImageIds: async (event, petaImageIds) => {
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
        getPetaTagInfos: async () => {
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
        log: async (event, id: string, ...args: any) => {
          dataLogger.log(LogFrom.RENDERER, id, ...args);
          return true;
        },
        openURL: async (event, url) => {
          const log = mainLogger.logChunk();
          log.log("#Open URL");
          log.log("url:", url);
          shell.openExternal(url);
          return true;
        },
        openImageFile: async (event, petaImage) => {
          const log = mainLogger.logChunk();
          log.log("#Open Image File");
          shell.showItemInFolder(petaDatas.getImagePath(petaImage, ImageType.ORIGINAL));
        },
        getAppInfo: async (event) => {
          const log = mainLogger.logChunk();
          log.log("#Get App Info");
          const info = {
            name: app.getName(),
            version: app.getVersion()
          };
          log.log("return:", info);
          return info;
        },
        showDBFolder: async (event) => {
          const log = mainLogger.logChunk();
          log.log("#Show DB Folder");
          shell.showItemInFolder(DIR_ROOT);
          return true;
        },
        showConfigFolder: async (event) => {
          const log = mainLogger.logChunk();
          log.log("#Show Config Folder");
          shell.showItemInFolder(DIR_APP);
          return true;
        },
        showImageInFolder: async (event, petaImage) => {
          const log = mainLogger.logChunk();
          log.log("#Show Image In Folder");
          shell.showItemInFolder(petaDatas.getImagePath(petaImage, ImageType.ORIGINAL));
          return true;
        },
        updateSettings: async (event, settings) => {
          const log = mainLogger.logChunk();
          try {
            log.log("#Update Settings");
            dataSettings.data = settings;
            mainWindow.setAlwaysOnTop(dataSettings.data.alwaysOnTop);
            dataSettings.save();
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
        getSettings: async (event) => {
          const log = mainLogger.logChunk();
          log.log("#Get Settings");
          log.log("return:", dataSettings.data);
          return dataSettings.data;
        },
        getWindowIsFocused: async (event) => {
          const log = mainLogger.logChunk();
          log.log("#Get Window Is Focused");
          const isFocued = mainWindow.isFocused();
          log.log("return:", isFocued);
          return isFocued;
        },
        setZoomLevel: async (event, level) => {
          const log = mainLogger.logChunk();
          log.log("#Set Zoom Level");
          log.log("level:", level);
          mainWindow.webContents.setZoomLevel(level);
        },
        windowMinimize: async (event) => {
          const log = mainLogger.logChunk();
          log.log("#Window Minimize");
          mainWindow.minimize();
        },
        windowMaximize: async (event) => {
          const log = mainLogger.logChunk();
          log.log("#Window Maximize");
          if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
            return;
          }
          mainWindow.maximize();
        },
        windowClose: async (event) => {
          const log = mainLogger.logChunk();
          log.log("#Window Close");
          app.quit();
        },
        getPlatform: async (event) => {
          const log = mainLogger.logChunk();
          log.log("#Get Platform");
          log.log("return:", process.platform);
          return process.platform;
        },
        regenerateMetadatas: async (event) => {
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
        browsePetaImageDirectory: async (event) => {
          const log = mainLogger.logChunk();
          log.log("#Browse PetaImage Directory");
          const file = await dialog.showOpenDialog(mainWindow, {
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
        },
        changePetaImageDirectory: async (event, path) => {
          const log = mainLogger.logChunk();
          try {
            log.log("#Change PetaImage Directory");
            path = Path.resolve(path);
            if (Path.resolve() == path) {
              log.error("Invalid file path:", path);
              return false;
            }
            if (DIR_APP == path) {
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
        getStates: async (event) => {
          const log = mainLogger.logChunk();
          log.log("#Get States");
          return dataStates.data;
        },
        waifu2xConvert: async (event, petaImages) => {
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
        installUpdate: async (event) => {
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
        startDrag: async (event, petaImages, iconSize, iconData) => {
          const first = petaImages[0];
          if (!first) {
            return;
          }
          draggingPreviewWindow.setPetaImages(petaImages, dataSettings.data.alwaysShowNSFW);
          draggingPreviewWindow.setSize(iconSize, first.height * iconSize);
          draggingPreviewWindow.setVisible(true);
          dropFromBrowserPetaImageIds = petaImages.map((petaImage) => petaImage.id);
          const files = petaImages.map((petaImage) => Path.resolve(DIR_IMAGES, petaImage.file.original));
          event.sender.startDrag({
            file: files[0]!,
            files: files,
            icon: nativeImage.createFromDataURL(Transparent),
          });
          draggingPreviewWindow.setVisible(false);
          setTimeout(() => {
            dropFromBrowserPetaImageIds = undefined;
          }, 100);
        },
        getDropFromBrowserPetaImageIds: async () => {
          if (!dropFromBrowserPetaImageIds) {
            return undefined;
          }
          const ids = [...dropFromBrowserPetaImageIds];
          dropFromBrowserPetaImageIds = undefined;
          draggingPreviewWindow.clearImages();
          draggingPreviewWindow.setVisible(false);
          return ids;
        },
        updateState: async (event, stateSet) => {
          const log = mainLogger.logChunk();
          log.log("#UpadteState");
          try {
            log.log(stateSet.key, "=", stateSet.value);
            (dataStates.data as any)[stateSet.key] = stateSet.value;
            dataStates.save();
            return true;
          } catch (error) {
            log.error(error);
          }
          return false;
        },
        importImagesByDragAndDrop: async (event, htmls, arrayBuffers, filePaths) => {
          const log = mainLogger.logChunk();
          log.log("#ImportImagesByDragAndDrop");
          log.log(htmls.length, arrayBuffers.length, filePaths.length);
          let petaImages: PetaImage[] = [];
          try {
            log.log("trying to download:", htmls);
            const buffers = await promiseSerial(
              async (url) => {
                let data: Buffer;
                if (url.trim().indexOf("data:") == 0) {
                  // dataURIだったら
                  data = dataURIToBuffer(url);
                } else {
                  // 普通のurlだったら
                  data = (await axios.get(url, { responseType: "arraybuffer" })).data;
                }
                return data;
              },
              htmls.map((html) => {
                return getURLFromImgTag(html);
              })
            ).promise;
            if (buffers.length > 0) {
              petaImages = await petaDatas.importImagesFromBuffers(
                buffers,
                "download"
              );
              log.log("result:", petaImages.length);
            }
          } catch (error) {
            log.error(error);
          }
          try {
            if (petaImages.length == 0) {
              if (arrayBuffers.length > 0) {
                log.log("trying to read ArrayBuffer:", arrayBuffers.length);
                petaImages = await petaDatas.importImagesFromBuffers(
                  arrayBuffers.map((ab) => {
                    return Buffer.from(ab);
                  }),
                  "noname"
                );
                log.log("result:", petaImages.length);
              }
            }
          } catch (error) {
            log.error(error);
          }
          try {
            if (petaImages.length == 0) {
              log.log("trying to read filePath:", filePaths.length);
              petaImages = await petaDatas.importImagesFromFilePaths(filePaths);
              log.log("result:", petaImages.length);
            }
          } catch (error) {
            log.error(error);
          }
          return petaImages.map((petaImage) => petaImage.id);
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
      mainLogger.logChunk().log("#Show Error", `code:${error.code}\ntitle: ${error.title}\nversion: ${app.getVersion()}\nmessage: ${error.message}`);
    } catch { }
    try {
      if (mainWindow && quit) {
        mainWindow.loadURL("data:text/html;charset=utf-8,");
      }
    } catch { }
    showErrorWindow(error, quit);
  }
  function emitMainEvent<U extends keyof MainEvents>(key: U, ...args: Parameters<MainEvents[U]>): void {
    mainWindow.webContents.send(key, ...args);
  }
  function initWindow() {
    const window = new BrowserWindow({
      width: dataStates.data.windowSize.width,
      height: dataStates.data.windowSize.height,
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
      trafficLightPosition: {
        x: 13,
        y: 13
      }
    });
    if (process.env.WEBPACK_DEV_SERVER_URL) {
      window.loadURL(process.env.WEBPACK_DEV_SERVER_URL as string)
      if (!process.env.IS_TEST) {
        window.webContents.openDevTools({ mode: "detach" });
      }
    } else {
      window.loadURL("app://./index.html");
    }
    window.setMenuBarVisibility(false);
    // window.webContents.debugger.attach("1.1");
    // console.log(window.webContents.debugger.isAttached(), window.webContents.debugger);
    // window.webContents.debugger.on('detach', (event, reason) => {
    //   console.log('Debugger detached due to : ', reason)
    // })
    // window.webContents.debugger.on("message", (event, method, params) => {
    //   if (method == "Network.responseReceived") {
    //     console.log(params.response);
    //   }
    //   console.log(method, params);
    // })
    // window.webContents.debugger.sendCommand('Network.enable');
    if (dataStates.data.windowIsMaximized) {
      window.maximize();
    }
    window.on("close", () => {
      if (!window.isMaximized()) {
        dataStates.data.windowSize.width = window.getSize()[0] || WINDOW_DEFAULT_WIDTH;
        dataStates.data.windowSize.height = window.getSize()[1] || WINDOW_DEFAULT_HEIGHT;
      }
      dataStates.data.windowIsMaximized = window.isMaximized();
      dataStates.save();
      const log = mainLogger.logChunk();
      log.log("#Save Window Size", dataStates.data.windowSize);
      if (process.platform !== "darwin") {
        draggingPreviewWindow.destroy();
      }
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
  async function prepareUpdate(remote: RemoteBinaryInfo) {
    updateInstallerFilePath = Path.resolve(DIR_DOWNLOAD, `ImagePetaPeta-${remote.version}.exe`);
    const log = mainLogger.logChunk();
    try {
      log.log("check downloaded binary", updateInstallerFilePath);
      // すでにバイナリが存在したらハッシュチェック。
      const sha256 = crypto.createHash("sha256").update(await file.readFile(updateInstallerFilePath)).digest("hex");
      if (sha256 == remote.sha256.win) {
        log.log("notify (donwload success)");
        // ハッシュが一致したらインストール確認通知
        emitMainEvent("notifyUpdate", remote.version, true);
        return;
      } else {
        log.log("notify (download failed)");
        emitMainEvent("notifyUpdate", remote.version, false);
        return;
      }
    } catch (error) {
      log.error(error);
    }
    try {
      const url = `https://github.com/takumus/ImagePetaPeta/releases/download/${remote.version}/ImagePetaPeta-beta.Setup.${remote.version}.exe`;
      log.log("download binary:", url);
      // バイナリをダウンロード
      const result = await axios.get(
        url,
        {
          responseType: "arraybuffer",
          onDownloadProgress: (event) => {
            // console.log(event);
          }
        }
      );
      log.log("binary downloaded:", url);
      // 保存
      await file.writeFile(updateInstallerFilePath, result.data);
      prepareUpdate(remote);
    } catch (error) {
      emitMainEvent("notifyUpdate", remote.version, false);
      log.error(error);
    }
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
      prepareUpdate(remote);
    } else {
      log.log("this version is latest");
    }
    checkUpdateTimeoutHandler = setTimeout(checkUpdate, UPDATE_CHECK_INTERVAL);
  }
  function relaunch() {
    app.relaunch();
    app.exit();
  }
})();