import { app, ipcMain, session, protocol, nativeTheme } from "electron";
import * as Path from "path";
import { createProtocol } from "vue-cli-plugin-electron-builder/lib";
import { UpdateMode } from "@/commons/datas/updateMode";
import { migratePetaImage, migratePetaTag, migratePetaImagesPetaTags } from "@/main/utils/migrater";
import { arrLast } from "@/commons/utils/utils";
import { getLatestVersion } from "@/commons/utils/versions";
import { RemoteBinaryInfo } from "@/commons/datas/remoteBinaryInfo";
// import { DraggingPreviewWindow } from "@/main/draggingPreviewWindow/draggingPreviewWindow";
import { WindowType } from "@/commons/datas/windowType";
import { initDI } from "@/main/initDI";
import { initWebhook } from "@/main/webhook/webhook";
import { mainLoggerKey } from "@/main/utils/mainLogger";
import { inject } from "@/main/utils/di";
import { petaImagesControllerKey } from "@/main/controllers/petaImagesController";
import { pathsKey } from "@/main/utils/paths";
import {
  dbPetaBoardsKey,
  dbPetaImagesKey,
  dbPetaImagesPetaTagsKey,
  dbPetaTagPartitionsKey,
  dbPetaTagsKey,
  dbStatusKey,
} from "@/main/databases";
import { configDBInfoKey, configSettingsKey } from "@/main/configs";
import { windowsKey } from "@/main/utils/windows";
import { isDarkMode } from "@/main/utils/isDarkMode";
import { getMainFunctions } from "@/main/ipcFunctions";
import { showError } from "@/main/errors/errorWindow";
import { PROTOCOLS, UPDATE_CHECK_INTERVAL } from "@/commons/defines";
import { PetaImages } from "@/commons/datas/petaImage";
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
  let checkUpdateTimeoutHandler: NodeJS.Timeout | undefined;
  //-------------------------------------------------------------------------------------------------//
  /*
    DIへ注入
  */
  //-------------------------------------------------------------------------------------------------//
  if (!initDI(showError)) {
    return;
  }
  const mainLogger = inject(mainLoggerKey);
  const paths = inject(pathsKey);
  const windows = inject(windowsKey);
  const dbPetaBoard = inject(dbPetaBoardsKey);
  const dbPetaImages = inject(dbPetaImagesKey);
  const dbPetaImagesPetaTags = inject(dbPetaImagesPetaTagsKey);
  const dbPetaTags = inject(dbPetaTagsKey);
  const dbPetaTagPartitions = inject(dbPetaTagPartitionsKey);
  const configDBInfo = inject(configDBInfoKey);
  const configSettings = inject(configSettingsKey);
  const petaImagesController = inject(petaImagesControllerKey);
  const dbStatus = inject(dbStatusKey);
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
    {
      scheme: PROTOCOLS.FILE.IMAGE_THUMBNAIL,
      privileges: {
        secure: true,
        supportFetchAPI: true,
      },
    },
    {
      scheme: PROTOCOLS.FILE.IMAGE_ORIGINAL,
      privileges: {
        secure: true,
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
      (req, res) => {
        res({
          path: Path.resolve(paths.DIR_IMAGES, arrLast(req.url.split("/"), "")),
        });
      },
    );
    session.defaultSession.protocol.registerFileProtocol(
      PROTOCOLS.FILE.IMAGE_THUMBNAIL,
      (req, res) => {
        res({
          path: Path.resolve(paths.DIR_THUMBNAILS, arrLast(req.url.split("/"), "")),
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
      ipcMain.handle(key, (event: Electron.IpcMainInvokeEvent, ...args: any[]) =>
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
        (toMainFunctions as any)[key](event, ...args),
      );
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
        dbPetaTagPartitions.init(),
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
        dbPetaTagPartitions.ensureIndex({
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
    //-------------------------------------------------------------------------------------------------//
    /*
      データのマイグレーション
    */
    //-------------------------------------------------------------------------------------------------//
    try {
      const petaImagesArray = dbPetaImages.getAll();
      const petaImages: PetaImages = {};
      petaImagesArray.forEach((pi) => {
        petaImages[pi.id] = pi;
        if (migratePetaImage(pi)) {
          mainLogger.logChunk().log("Migrate PetaImage");
          petaImagesController.updatePetaImages([pi], UpdateMode.UPDATE, true);
        }
      });
      if (await migratePetaTag(dbPetaTags, petaImages)) {
        mainLogger.logChunk().log("Migrate PetaTags");
        await petaImagesController.updatePetaImages(petaImagesArray, UpdateMode.UPDATE, true);
      }
      if (await migratePetaImagesPetaTags(dbPetaTags, dbPetaImagesPetaTags, petaImages)) {
        mainLogger.logChunk().log("Migrate PetaImagesPetaTags");
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
    dbStatus.initialized = true;
    windows.emitMainEvent("dataInitialized");
    //-------------------------------------------------------------------------------------------------//
    /*
      Webhooks
    */
    //-------------------------------------------------------------------------------------------------//
    if (configSettings.data.developerMode) {
      initWebhook(toMainFunctions, mainLogger);
    }
  });
  //-------------------------------------------------------------------------------------------------//
  /*
    色々な関数
  */
  //-------------------------------------------------------------------------------------------------//
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
})();
