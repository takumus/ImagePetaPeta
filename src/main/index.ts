import { app, protocol } from "electron";
import * as Path from "path";

import { PROTOCOLS } from "@/commons/defines";
import { getPetaFileInfoFromURL } from "@/commons/utils/getPetaFileInfoFromURL";

import { initDB } from "@/main/initDB";
import { initDI } from "@/main/initDI";
import { ipcFunctions, registerIpcFunctions } from "@/main/ipcFunctions";
import { useConfigSettings } from "@/main/provides/configs";
import { useLogger } from "@/main/provides/utils/logger";
import { usePaths } from "@/main/provides/utils/paths";
import { useQuit } from "@/main/provides/utils/quit";
import { useWindows } from "@/main/provides/windows";
import { observeDarkMode } from "@/main/utils/darkMode";
import { getPetaFilePath } from "@/main/utils/getPetaFileDirectory";
import { checkAndNotifySoftwareUpdate } from "@/main/utils/softwareUpdater";
import { initWebhook } from "@/main/webhook";

(() => {
  if (!app.requestSingleInstanceLock()) {
    app.exit();
    return;
  }
  // DI準備
  if (!initDI()) {
    return;
  }
  const logger = useLogger();
  const paths = usePaths();
  const windows = useWindows();
  const configSettings = useConfigSettings();
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
      },
    },
  ]);
  // Macでドックアイコン押した時。
  app.on("activate", async () => {
    logger.logMainChunk().log("$Electron event: activate");
    if (
      (windows.windows.board === undefined || windows.windows.board.isDestroyed()) &&
      (windows.windows.browser === undefined || windows.windows.browser.isDestroyed())
    ) {
      windows.showWindows();
    }
  });
  // 既に起動してるのに起動した場合
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
  // これがないとだめ。
  app.on("window-all-closed", () => {
    //
  });
  // XXXX:// でブラウザなどから起動できるように
  app.setAsDefaultProtocolClient("image-petapeta");
  app.on("will-quit", (e) => {
    e.preventDefault();
    useQuit().quit();
  });
  // electron準備OK
  async function appReady() {
    logger
      .logMainChunk()
      .log(
        `\n####################################\n#-------APPLICATION LAUNCHED-------#\n####################################`,
      );
    logger.logMainChunk().log(`verison: ${app.getVersion()}`);
    // プロトコル登録
    protocol.registerFileProtocol(PROTOCOLS.FILE.IMAGE_ORIGINAL, (req, res) => {
      const info = getPetaFileInfoFromURL(req.url);
      res({
        path: getPetaFilePath.fromIDAndFilename(info.id, info.filename, "original"),
      });
    });
    protocol.registerFileProtocol(PROTOCOLS.FILE.IMAGE_THUMBNAIL, (req, res) => {
      const info = getPetaFileInfoFromURL(req.url);
      res({
        path: getPetaFilePath.fromIDAndFilename(info.id, info.filename, "thumbnail"),
      });
    });
    // ipcの関数登録
    registerIpcFunctions();
    // 初期ウインドウ表示
    windows.showWindows();
    // ダークモード監視開始
    observeDarkMode();
    // アップデート確認と通知
    checkAndNotifySoftwareUpdate();
    // dbの初期化
    await initDB();
    // webhook有効化
    if (configSettings.data.developerMode) {
      initWebhook(ipcFunctions);
    }
  }
  app.on("ready", appReady);
})();
