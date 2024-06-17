import { app, protocol, session } from "electron";
import installExtension from "electron-devtools-installer";

import { PROTOCOLS, WEBHOOK_PORT } from "@/commons/defines";

import { initDB } from "@/main/initDB";
import { initDI } from "@/main/initDI";
import { registerIpcFunctions } from "@/main/ipcFunctions";
import { useConfigSecureFilePassword, useConfigSettings } from "@/main/provides/configs";
import { usePetaFilesController } from "@/main/provides/controllers/petaFilesController/petaFilesController";
import { useHandleFileResponse } from "@/main/provides/handleFileResponse";
import { usePageDownloaderCache } from "@/main/provides/pageDownloaderCache";
import { useLogger } from "@/main/provides/utils/logger";
import { windowIs } from "@/main/provides/utils/windowIs";
import { useWebHook } from "@/main/provides/webhook";
import { useWindows } from "@/main/provides/windows";
import { observeDarkMode } from "@/main/utils/darkMode";
import { checkAndNotifySoftwareUpdate } from "@/main/utils/softwareUpdater";

const launchTime = performance.now();
(() => {
  if (!app.requestSingleInstanceLock()) {
    app.quit();
    return;
  }
  // DI準備
  if (!initDI()) {
    return;
  }
  const logger = useLogger();
  process.on("uncaughtException", function (error) {
    logger.logChunk("Nicht Abgefangene Ausnahme").error(error);
  });
  const windows = useWindows();
  const configSettings = useConfigSettings();
  const handleFileResponse = useHandleFileResponse();
  const pageDownloaderCache = usePageDownloaderCache();
  // コマンドライン引数
  if (configSettings.data.disableAcceleratedVideoDecode) {
    app.commandLine.appendSwitch("disable-accelerated-video-decode");
  }
  // プロトコル準備
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
        stream: true,
      },
    },
    {
      scheme: PROTOCOLS.FILE.PAGE_DOWNLOADER_CACHE,
      privileges: {
        supportFetchAPI: true,
        stream: true,
      },
    },
  ]);
  // Macでドックアイコン押した時。
  app.on("activate", async () => {
    logger.logChunk("App Event").debug("activate");
    if (windowIs.dead("board") && windowIs.dead("browser")) {
      windows.showWindows();
    }
  });
  // 既に起動してるのに起動した場合
  app.on("second-instance", () => {
    const count = Object.values(windows.windows)
      .filter((window) => windowIs.alive(window))
      .map((window) => {
        window.focus();
      }).length;
    if (count < 1) {
      windows.showWindows();
    }
  });
  // これがないとだめ。
  app.on("window-all-closed", () => {
    //
  });
  // XXXX:// でブラウザなどから起動できるように
  app.setAsDefaultProtocolClient("image-petapeta");
  app.on("will-quit", (e) => {
    // e.preventDefault();
    // useQuit().quit();
  });
  // electron準備OK
  async function appReady() {
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          "Content-Security-Policy": [
            [
              "default-src",
              "'self'",
              "'unsafe-inline'",
              "'unsafe-eval'",
              "data:",
              "blob:",
              "file:",
              PROTOCOLS.FILE.IMAGE_ORIGINAL + ":",
              PROTOCOLS.FILE.IMAGE_THUMBNAIL + ":",
              PROTOCOLS.FILE.PAGE_DOWNLOADER_CACHE + ":",
            ].join(" "),
          ],
        },
      });
    });
    const log = logger.logChunk("Launch");
    log.debug(
      `\n####################################\n#-------APPLICATION LAUNCHED-------#\n####################################`,
    );
    log.debug(`Ready:${performance.now() - launchTime}ms`);
    log.debug(import.meta.env);
    log.debug(`verison: ${app.getVersion()}`);
    if (process.env.NODE_ENV === "development") {
      try {
        log.debug("install vue devtools");
        await installExtension("nhdogjmejiglipccpnnnanhbledajbpd");
      } catch (error) {
        log.error(error);
      }
    }
    protocol.handle(PROTOCOLS.FILE.IMAGE_ORIGINAL, handleFileResponse.fileResponse("original"));
    protocol.handle(PROTOCOLS.FILE.IMAGE_THUMBNAIL, handleFileResponse.fileResponse("thumbnail"));
    protocol.handle(
      PROTOCOLS.FILE.PAGE_DOWNLOADER_CACHE,
      pageDownloaderCache.handle.bind(pageDownloaderCache),
    );
    // ipcの関数登録
    registerIpcFunctions();
    // 初期ウインドウ表示
    windows.showWindows();
    log.debug(`ShowWindows:${performance.now() - launchTime}ms`);
    // ダークモード監視開始
    observeDarkMode();
    // アップデート確認と通知
    checkAndNotifySoftwareUpdate();
    // dbの初期化
    await initDB();
    // webhook有効化
    if (configSettings.data.web) {
      await useWebHook().open(WEBHOOK_PORT);
    }
    log.debug(`Init DB:${performance.now() - launchTime}ms`);
    // usePetaFilesController().verifyFiles();
    // useConfigSecureFilePassword().setValue("1234");
    // console.log(useConfigSecureFilePassword().getValue());
  }
  app.on("ready", appReady);
})();
