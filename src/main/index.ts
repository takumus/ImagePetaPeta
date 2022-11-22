import { app, ipcMain, nativeTheme, protocol, session } from "electron";
import * as Path from "path";
import { createProtocol } from "vue-cli-plugin-electron-builder/lib";

import { RemoteBinaryInfo } from "@/commons/datas/remoteBinaryInfo";
// import { DraggingPreviewWindow } from "@/main/draggingPreviewWindow/draggingPreviewWindow";
import { WindowType } from "@/commons/datas/windowType";
import { PROTOCOLS, UPDATE_CHECK_INTERVAL } from "@/commons/defines";
import { arrLast } from "@/commons/utils/utils";
import { getLatestVersion } from "@/commons/utils/versions";

import { showError } from "@/main/errors/errorWindow";
import { initDB } from "@/main/initDB";
import { initDI } from "@/main/initDI";
import { getMainFunctions } from "@/main/ipcFunctions";
import { useConfigSettings } from "@/main/provides/configs";
import { useDBStatus } from "@/main/provides/databases";
import { useLogger } from "@/main/provides/utils/logger";
import { usePaths } from "@/main/provides/utils/paths";
import { useWindows } from "@/main/provides/utils/windows";
import { isDarkMode } from "@/main/utils/isDarkMode";
import { initWebhook } from "@/main/webhook/webhook";

(() => {
  /*------------------------------------
    シングルインスタンス化
  ------------------------------------*/
  if (!app.requestSingleInstanceLock()) {
    app.quit();
    return;
  }
  let checkUpdateTimeoutHandler: NodeJS.Timeout | undefined;
  //-------------------------------------------------------------------------------------------------//
  /*
    DIへ注入
  */
  //-------------------------------------------------------------------------------------------------//
  if (!initDI(showError)) {
    return;
  }
  const logger = useLogger();
  const paths = usePaths();
  const windows = useWindows();
  const configSettings = useConfigSettings();
  const dbStatus = useDBStatus();
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
    logger.logMainChunk().log("$Electron event: activate");
    if (
      (windows.windows.board === undefined || windows.windows.board.isDestroyed()) &&
      (windows.windows.browser === undefined || windows.windows.browser.isDestroyed())
    ) {
      windows.showWindows();
    }
  });
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
    logger
      .logMainChunk()
      .log(
        `\n####################################\n#-------APPLICATION LAUNCHED-------#\n####################################`,
      );
    logger.logMainChunk().log(`verison: ${app.getVersion()}`);
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
      データベースの初期化
    */
    //-------------------------------------------------------------------------------------------------//
    await initDB();
    dbStatus.initialized = true;
    windows.emitMainEvent("dataInitialized");
    //-------------------------------------------------------------------------------------------------//
    /*
      Webhooks
    */
    //-------------------------------------------------------------------------------------------------//
    if (configSettings.data.developerMode) {
      initWebhook(toMainFunctions);
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
    const log = logger.logMainChunk();
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
