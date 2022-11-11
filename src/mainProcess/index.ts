import {
  app,
  ipcMain,
  dialog,
  IpcMainInvokeEvent,
  shell,
  session,
  protocol,
  nativeImage,
  nativeTheme,
  desktopCapturer,
  screen,
} from "electron";
import * as Path from "path";
import { createProtocol } from "vue-cli-plugin-electron-builder/lib";
import { DEFAULT_BOARD_NAME, EULA, PROTOCOLS, UPDATE_CHECK_INTERVAL } from "@/commons/defines";
import * as file from "@/mainProcess/storages/file";
import { PetaImage, PetaImages } from "@/commons/datas/petaImage";
import { createPetaBoard } from "@/commons/datas/petaBoard";
import { UpdateMode } from "@/commons/datas/updateMode";
import { ToMainFunctions } from "@/commons/ipc/toMainFunctions";
import { ImageType } from "@/commons/datas/imageType";
import {
  migratePetaImage,
  migratePetaTag,
  migratePetaImagesPetaTags,
} from "@/mainProcess/utils/migrater";
import { arrLast } from "@/commons/utils/utils";
import { showErrorWindow, ErrorWindowParameters } from "@/mainProcess/errors/errorWindow";
import * as Tasks from "@/mainProcess/tasks/task";
import { getLatestVersion } from "@/commons/utils/versions";
import { RemoteBinaryInfo } from "@/commons/datas/remoteBinaryInfo";
import Transparent from "@/@assets/transparent.png";
// import { DraggingPreviewWindow } from "@/mainProcess/draggingPreviewWindow/draggingPreviewWindow";
import { WindowType } from "@/commons/datas/windowType";
import { searchImageByGoogle } from "@/mainProcess/utils/searchImageByGoogle";
import { getConstants } from "@/mainProcess/constants";
import { LogFrom } from "@/mainProcess/storages/logger";
import { initWebhook } from "@/mainProcess/webhook/webhook";
import { ppa } from "@/commons/utils/pp";
import { ImportFileInfo } from "@/commons/datas/importFileInfo";
import { getURLFromHTML } from "@/rendererProcess/utils/getURLFromHTML";
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
  // const draggingPreviewWindow = new DraggingPreviewWindow();
  let temporaryShowNSFW = false;
  let isDataInitialized = false;
  let detailsPetaImage: PetaImage | undefined;
  let checkUpdateTimeoutHandler: NodeJS.Timeout | undefined;
  //-------------------------------------------------------------------------------------------------//
  /*
    ファイルパスとDBの、検証・読み込み・作成
  */
  //-------------------------------------------------------------------------------------------------//
  const constants = getConstants(showError);
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
    configDBInfo,
    petaDatas,
    windows,
    mainLogger,
  } = constants;
  //-------------------------------------------------------------------------------------------------//
  /*
    electronのready前にやらないといけない事
  */
  //-------------------------------------------------------------------------------------------------//
  protocol.registerSchemesAsPrivileged([
    {
      scheme: "app",
      privileges: {
        secure: true,
        standard: true,
      },
    },
  ]);
  protocol.registerSchemesAsPrivileged([
    {
      scheme: PROTOCOLS.FILE.IMAGE_THUMBNAIL,
      privileges: {
        supportFetchAPI: true,
      },
    },
    {
      scheme: PROTOCOLS.FILE.IMAGE_ORIGINAL,
      privileges: {
        supportFetchAPI: true,
      },
    },
  ]);
  app.on("activate", async () => {
    mainLogger.logChunk().log("$Electron event: activate");
    if (
      (windows.windows.board === undefined || windows.windows.board.isDestroyed()) &&
      (windows.windows.browser === undefined || windows.windows.browser.isDestroyed())
    ) {
      windows.showWindows();
    }
  });
  // app.on("before-quit", () => {
  //   draggingPreviewWindow.destroy();
  // });
  app.on("window-all-closed", () => {
    //
  });
  app.on("second-instance", () => {
    const count = Object.values(windows.windows)
      .filter((window) => {
        return window !== undefined && !window.isDestroyed();
      })
      .map((window) => {
        window?.focus();
      }).length;
    if (count < 1) {
      windows.showWindows();
    }
  });
  app.setAsDefaultProtocolClient("image-petapeta");
  //-------------------------------------------------------------------------------------------------//
  /*
    electronのready
  */
  //-------------------------------------------------------------------------------------------------//
  app.on("ready", async () => {
    mainLogger
      .logChunk()
      .log(
        `\n####################################\n#-------APPLICATION LAUNCHED-------#\n####################################`,
      );
    mainLogger.logChunk().log(`verison: ${app.getVersion()}`);
    //-------------------------------------------------------------------------------------------------//
    /*
      画像用URL作成
    */
    //-------------------------------------------------------------------------------------------------//
    session.defaultSession.protocol.registerFileProtocol(
      PROTOCOLS.FILE.IMAGE_ORIGINAL,
      async (req, res) => {
        res({
          path: Path.resolve(DIR_IMAGES, arrLast(req.url.split("/"), "")),
        });
      },
    );
    session.defaultSession.protocol.registerFileProtocol(
      PROTOCOLS.FILE.IMAGE_THUMBNAIL,
      async (req, res) => {
        res({
          path: Path.resolve(DIR_THUMBNAILS, arrLast(req.url.split("/"), "")),
        });
      },
    );
    //-------------------------------------------------------------------------------------------------//
    /*
      ipcへ関数を登録
    */
    //-------------------------------------------------------------------------------------------------//
    const toMainFunctions = getMainFunctions();
    Object.keys(toMainFunctions).forEach((key) => {
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      ipcMain.handle(key, (toMainFunctions as any)[key] as any);
    });
    //-------------------------------------------------------------------------------------------------//
    /*
      メインウインドウ・プレビューウインドウを初期化
    */
    //-------------------------------------------------------------------------------------------------//
    createProtocol("app");
    nativeTheme.on("updated", () => {
      windows.emitMainEvent("darkMode", isDarkMode());
    });
    windows.showWindows();
    checkUpdate();
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
        dbPetaImagesPetaTags.init(),
      ]);
      await Promise.all([
        dbPetaTags.ensureIndex({
          fieldName: "id",
          unique: true,
        }),
        dbPetaImages.ensureIndex({
          fieldName: "id",
          unique: true,
        }),
        dbPetaTags.ensureIndex({
          fieldName: "id",
          unique: true,
        }),
        dbPetaImagesPetaTags.ensureIndex({
          fieldName: "id",
          unique: true,
        }),
      ]);
    } catch (error) {
      showError({
        category: "M",
        code: 2,
        title: "Initialization Error",
        message: String(error),
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
      const petaImagesArray = dbPetaImages.getAll();
      const petaImages: PetaImages = {};
      petaImagesArray.forEach((pi) => {
        petaImages[pi.id] = migratePetaImage(pi);
      });
      if (await migratePetaTag(dbPetaTags, petaImages)) {
        mainLogger.logChunk().log("Upgrade Tags");
        await petaDatas.petaImages.updatePetaImages(petaImagesArray, UpdateMode.UPDATE, true);
      }
      if (await migratePetaImagesPetaTags(dbPetaTags, dbPetaImagesPetaTags, petaImages)) {
        mainLogger.logChunk().log("Upgrade PetaImagesPetaTags");
      }
      if (configDBInfo.data.version !== app.getVersion()) {
        configDBInfo.data.version = app.getVersion();
        configDBInfo.save();
      }
    } catch (error) {
      showError({
        category: "M",
        code: 3,
        title: "Migration Error",
        message: String(error),
      });
      return;
    }
    //-------------------------------------------------------------------------------------------------//
    /*
      Webhooks
    */
    //-------------------------------------------------------------------------------------------------//
    if (configSettings.data.developerMode) {
      initWebhook(toMainFunctions, mainLogger);
    }
    //-------------------------------------------------------------------------------------------------//
    /*
      IPCのメインプロセス側のAPI
    */
    //-------------------------------------------------------------------------------------------------//
    function getMainFunctions(): {
      [P in keyof ToMainFunctions]: (
        event: IpcMainInvokeEvent,
        ...args: Parameters<ToMainFunctions[P]>
      ) => ReturnType<ToMainFunctions[P]>;
    } {
      return {
        async browseAndImportImageFiles(event, type) {
          const log = mainLogger.logChunk();
          log.log("#Browse Image Files");
          const windowInfo = windows.getWindowByEvent(event);
          if (windowInfo) {
            const result = await dialog.showOpenDialog(windowInfo.window, {
              properties: type === "files" ? ["openFile", "multiSelections"] : ["openDirectory"],
            });
            petaDatas.petaImages.importImagesFromFileInfos({
              fileInfos: result.filePaths.map((path) => ({ path })),
              extract: true,
            });
            return result.filePaths.length;
          }
          return 0;
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
        async getPetaImages() {
          const log = mainLogger.logChunk();
          try {
            log.log("#Get PetaImages");
            const petaImages = await petaDatas.petaImages.getPetaImages();
            log.log("return:", true);
            return petaImages;
          } catch (e) {
            log.error(e);
            showError({
              category: "M",
              code: 100,
              title: "Get PetaImages Error",
              message: String(e),
            });
          }
          return {};
        },
        async updatePetaImages(event, datas, mode) {
          const log = mainLogger.logChunk();
          try {
            log.log("#Update PetaImages");
            await petaDatas.petaImages.updatePetaImages(datas, mode);
            log.log("return:", true);
            return true;
          } catch (err) {
            log.error(err);
            showError({
              category: "M",
              code: 200,
              title: "Update PetaImages Error",
              message: String(err),
            });
          }
          return false;
        },
        async getPetaBoards() {
          const log = mainLogger.logChunk();
          try {
            log.log("#Get PetaBoards");
            const petaBoards = await petaDatas.petaBoards.getPetaBoards();
            const length = Object.keys(petaBoards).length;
            if (length === 0) {
              log.log("no boards! create empty board");
              const board = createPetaBoard(DEFAULT_BOARD_NAME, 0, isDarkMode());
              await petaDatas.petaBoards.updatePetaBoards([board], UpdateMode.INSERT);
              petaBoards[board.id] = board;
            }
            log.log("return:", length);
            return petaBoards;
          } catch (e) {
            log.error(e);
            showError({
              category: "M",
              code: 100,
              title: "Get PetaBoards Error",
              message: String(e),
            });
          }
          return {};
        },
        async updatePetaBoards(event, boards, mode) {
          const log = mainLogger.logChunk();
          try {
            log.log("#Update PetaBoards");
            await petaDatas.petaBoards.updatePetaBoards(boards, mode);
            log.log("return:", true);
            return true;
          } catch (e) {
            log.error(e);
            showError({
              category: "M",
              code: 200,
              title: "Update PetaBoards Error",
              message: String(e),
            });
          }
          return false;
        },
        async updatePetaTags(event, tags, mode) {
          const log = mainLogger.logChunk();
          try {
            log.log("#Update PetaTags");
            await petaDatas.petaTags.updatePetaTags(tags, mode);
            log.log("return:", true);
            return true;
          } catch (error) {
            log.error(error);
            showError({
              category: "M",
              code: 200,
              title: "Update PetaTags Error",
              message: String(error),
            });
          }
          return false;
        },
        async updatePetaImagesPetaTags(event, petaImageIds, petaTagLikes, mode) {
          const log = mainLogger.logChunk();
          try {
            log.log("#Update PetaImagesPetaTags");
            await petaDatas.petaTags.updatePetaImagesPetaTags(petaImageIds, petaTagLikes, mode);
            log.log("return:", true);
            return true;
          } catch (error) {
            log.error(error);
            showError({
              category: "M",
              code: 200,
              title: "Update PetaImagesPetaTags Error",
              message: String(error),
            });
          }
          return false;
        },
        async getPetaImageIds(event, params) {
          const log = mainLogger.logChunk();
          try {
            log.log("#Get PetaImageIds");
            log.log("type:", params.type);
            const ids = await petaDatas.petaTags.getPetaImageIds(params);
            log.log("return:", ids.length);
            return ids;
          } catch (error) {
            log.error(error);
            showError({
              category: "M",
              code: 100,
              title: "Get PetaImageIds Error",
              message: String(error),
            });
          }
          return [];
        },
        async getPetaTagIdsByPetaImageIds(event, petaImageIds) {
          const log = mainLogger.logChunk();
          try {
            // log.log("#Get PetaTagIds By PetaImageIds");
            const petaTagIds = await petaDatas.petaTags.getPetaTagIdsByPetaImageIds(petaImageIds);
            // log.log("return:", petaTagIds.length);
            return petaTagIds;
          } catch (error) {
            log.error(error);
            showError({
              category: "M",
              code: 100,
              title: "Get PetaTagIds By PetaImageIds Error",
              message: String(error),
            });
          }
          return [];
        },
        async getPetaTags() {
          const log = mainLogger.logChunk();
          try {
            log.log("#Get PetaTags");
            const petaTags = await petaDatas.petaTags.getPetaTags();
            log.log("return:", petaTags.length);
            return petaTags;
          } catch (error) {
            log.error(error);
            showError({
              category: "M",
              code: 100,
              title: "Get PetaTags Error",
              message: String(error),
            });
          }
          return [];
        },
        async getPetaTagCounts() {
          const log = mainLogger.logChunk();
          try {
            log.log("#Get PetaTagCounts");
            const petaTagCounts = await petaDatas.petaTags.getPetaTagCounts();
            log.log("return:", Object.values(petaTagCounts).length);
            return petaTagCounts;
          } catch (error) {
            log.error(error);
            showError({
              category: "M",
              code: 100,
              title: "Get PetaTagCounts Error",
              message: String(error),
            });
          }
          return {};
        },
        async log(event, id: string, ...args: unknown[]) {
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
          shell.showItemInFolder(petaDatas.petaImages.getImagePath(petaImage, ImageType.ORIGINAL));
        },
        async getAppInfo() {
          const log = mainLogger.logChunk();
          log.log("#Get App Info");
          const info = {
            name: app.getName(),
            version: app.getVersion(),
          };
          log.log("return:", info);
          return info;
        },
        async showDBFolder() {
          const log = mainLogger.logChunk();
          log.log("#Show DB Folder");
          shell.showItemInFolder(DIR_ROOT);
          return true;
        },
        async showConfigFolder() {
          const log = mainLogger.logChunk();
          log.log("#Show Config Folder");
          shell.showItemInFolder(DIR_APP);
          return true;
        },
        async showImageInFolder(event, petaImage) {
          const log = mainLogger.logChunk();
          log.log("#Show Image In Folder");
          shell.showItemInFolder(petaDatas.petaImages.getImagePath(petaImage, ImageType.ORIGINAL));
          return true;
        },
        async updateSettings(event, settings) {
          const log = mainLogger.logChunk();
          try {
            log.log("#Update Settings");
            configSettings.data = settings;
            Object.keys(windows.windows).forEach((key) => {
              const window = windows.windows[key as WindowType];
              if (window === undefined || window.isDestroyed()) {
                return;
              }
              window.setAlwaysOnTop(configSettings.data.alwaysOnTop);
            });
            configSettings.save();
            windows.emitMainEvent("updateSettings", settings);
            windows.emitMainEvent("showNSFW", getShowNSFW());
            windows.emitMainEvent("darkMode", isDarkMode());
            log.log("return:", configSettings.data);
            return true;
          } catch (e) {
            log.error(e);
            showError({
              category: "M",
              code: 200,
              title: "Update Settings Error",
              message: String(e),
            });
          }
          return false;
        },
        async getSettings() {
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
        async windowMinimize(event) {
          const log = mainLogger.logChunk();
          log.log("#Window Minimize");
          windows.getWindowByEvent(event)?.window.minimize();
        },
        async windowMaximize(event) {
          const log = mainLogger.logChunk();
          log.log("#Window Maximize");
          const windowInfo = windows.getWindowByEvent(event);
          if (windowInfo?.window.isMaximized()) {
            windowInfo?.window.unmaximize();
            return;
          }
          windowInfo?.window.maximize();
        },
        async windowClose(event) {
          const log = mainLogger.logChunk();
          log.log("#Window Close");
          windows.getWindowByEvent(event)?.window.close();
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
        async getPlatform() {
          const log = mainLogger.logChunk();
          log.log("#Get Platform");
          log.log("return:", process.platform);
          return process.platform;
        },
        async regenerateMetadatas() {
          const log = mainLogger.logChunk();
          try {
            log.log("#Regenerate Thumbnails");
            await petaDatas.petaImages.regenerateMetadatas();
            return;
          } catch (err) {
            log.error(err);
            showError({
              category: "M",
              code: 200,
              title: "Regenerate Thumbnails Error",
              message: String(err),
            });
          }
          return;
        },
        async browsePetaImageDirectory(event) {
          const log = mainLogger.logChunk();
          log.log("#Browse PetaImage Directory");
          const windowInfo = windows.getWindowByEvent(event);
          if (windowInfo) {
            const filePath = (
              await dialog.showOpenDialog(windowInfo.window, {
                properties: ["openDirectory"],
              })
            ).filePaths[0];
            if (filePath === undefined) {
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
          } catch (error) {
            log.error(error);
          }
          return false;
        },
        async getStates() {
          const log = mainLogger.logChunk();
          log.log("#Get States");
          return configStates.data;
        },
        async realESRGANConvert(event, petaImages, modelName) {
          const log = mainLogger.logChunk();
          try {
            log.log("#Real-ESRGAN Convert");
            const result = await petaDatas.realESRGAN(petaImages, modelName);
            log.log("return:", result);
            return result;
          } catch (error) {
            log.error(error);
          }
          return false;
        },
        async startDrag(event, petaImages) {
          const first = petaImages[0];
          if (!first) {
            return;
          }
          const firstPath = Path.resolve(DIR_IMAGES, first.file.original);
          // draggingPreviewWindow.createWindow();
          // draggingPreviewWindow.setPetaImages(petaImages, configSettings.data.alwaysShowNSFW);
          // draggingPreviewWindow.setSize(iconSize, (first.height / first.width) * iconSize);
          // draggingPreviewWindow.setVisible(true);
          const files = petaImages.map((petaImage) =>
            Path.resolve(DIR_IMAGES, petaImage.file.original),
          );
          if (windows.windows.board !== undefined && !windows.windows.board.isDestroyed()) {
            windows.windows.board.moveTop();
          }
          // draggingPreviewWindow.window?.moveTop();
          // await new Promise((res) => {
          //   setTimeout(res, 100);
          // });
          event.sender.startDrag({
            file: firstPath,
            files: files,
            icon: nativeImage.createFromDataURL(Transparent),
          });
          // draggingPreviewWindow.setVisible(false);
          // draggingPreviewWindow.destroy();
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
          } catch (e) {
            log.error(e);
          }
          return false;
        },
        async importImages(event, datas) {
          const log = mainLogger.logChunk();
          try {
            log.log("#importImages");
            log.log(datas.length);
            const logFromBrowser = mainLogger.logChunk();
            const ids = datas
              .filter(
                (data) =>
                  data[0]?.type === "filePath" &&
                  Path.resolve(Path.dirname(data[0].filePath)) === Path.resolve(DIR_IMAGES),
              )
              .map(
                (data) =>
                  Path.basename(data[0]?.type === "filePath" ? data[0].filePath : "?").split(
                    ".",
                  )[0] ?? "?",
              );
            logFromBrowser.log("## From Browser");
            if (ids.length > 0 && ids.length === datas.length) {
              logFromBrowser.log("return:", ids.length);
              return ids;
            } else {
              logFromBrowser.log("return:", false);
            }
            const fileInfos = (
              await ppa(async (data): Promise<ImportFileInfo | undefined> => {
                for (let i = 0; i < data.length; i++) {
                  const d = data[i];
                  if (d?.type === "filePath") {
                    return {
                      path: d.filePath,
                    };
                  }
                  if (d?.type === "url") {
                    const result = await petaDatas.petaImages.createFileInfoFromURL(d.url);
                    if (result !== undefined) {
                      return result;
                    }
                  }
                  if (d?.type === "html") {
                    const url = getURLFromHTML(d.html);
                    if (url !== undefined) {
                      const result = await petaDatas.petaImages.createFileInfoFromURL(url);
                      if (result !== undefined) {
                        return result;
                      }
                    }
                  }
                  if (d?.type === "buffer") {
                    const result = await petaDatas.petaImages.createFileInfoFromBuffer(d.buffer);
                    if (result !== undefined) {
                      return result;
                    }
                  }
                }
                return undefined;
              }, datas).promise
            ).filter((info) => info !== undefined) as ImportFileInfo[];
            const petaImageIds = (
              await petaDatas.petaImages.importImagesFromFileInfos({
                fileInfos,
                extract: true,
              })
            ).map((petaImage) => petaImage.id);
            log.log("return:", petaImageIds.length);
            return petaImageIds;
          } catch (e) {
            log.error(e);
          }
          return [];
        },
        async openWindow(event, windowType) {
          const log = mainLogger.logChunk();
          log.log("#Open Window");
          log.log("type:", windowType);
          windows.openWindow(windowType, event);
        },
        async reloadWindow(event) {
          const log = mainLogger.logChunk();
          log.log("#Reload Window");
          const type = windows.reloadWindowByEvent(event);
          log.log("type:", type);
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
          return getLatestVersion();
        },
        async eula(event, agree) {
          const log = mainLogger.logChunk();
          log.log("#EULA");
          log.log(agree ? "agree" : "disagree", EULA);
          if (configSettings.data.eula === EULA) {
            return;
          }
          if (agree) {
            configSettings.data.eula = EULA;
            configSettings.save();
            relaunch();
          } else {
            app.quit();
          }
        },
        async getMediaSources() {
          const displaySizes = screen.getAllDisplays().reduce(
            (displaySizes, display) => ({
              ...displaySizes,
              [display.id.toString()]: {
                width: display.size.width * display.scaleFactor,
                height: display.size.height * display.scaleFactor,
                scale: display.scaleFactor,
              },
            }),
            {} as { [key: string]: { width: number; height: number; scale: number } },
          );
          return (await desktopCapturer.getSources({ types: ["screen"] })).map((source) => ({
            name: source.name,
            id: source.id,
            thumbnailDataURL: source.thumbnail.toDataURL(),
            size: displaySizes[source.display_id],
          }));
        },
      };
    }
  });
  //-------------------------------------------------------------------------------------------------//
  /*
    色々な関数
  */
  //-------------------------------------------------------------------------------------------------//
  function showError(error: ErrorWindowParameters, quit = true) {
    try {
      Object.values(windows.windows).forEach((window) => {
        if (window !== undefined && !window.isDestroyed()) {
          window.loadURL("about:blank");
        }
      });
    } catch {
      //
    }
    showErrorWindow(error, quit);
  }
  async function checkUpdate() {
    if (checkUpdateTimeoutHandler) {
      clearTimeout(checkUpdateTimeoutHandler);
    }
    const log = mainLogger.logChunk();
    log.log("$Check Update");
    if (process.platform != "win32") {
      log.log("mac os is not available");
      return;
    }
    const remote: RemoteBinaryInfo = await getLatestVersion();
    log.log(remote);
    if (!remote.isLatest) {
      log.log("this version is old");
      windows.openWindow(WindowType.SETTINGS);
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
  function getShowNSFW() {
    return temporaryShowNSFW || configSettings.data.alwaysShowNSFW;
  }
  function relaunch() {
    app.relaunch();
    app.exit();
  }
})();
