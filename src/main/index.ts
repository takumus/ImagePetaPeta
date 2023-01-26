import { app, protocol } from "electron";
import * as Path from "path";
import { createProtocol } from "vue-cli-plugin-electron-builder/lib";

import { PROTOCOLS } from "@/commons/defines";
import { getLastSegmentFromURL } from "@/commons/utils/getLastSegmentFromURL";

import { initDB } from "@/main/initDB";
import { initDI } from "@/main/initDI";
import { ipcFunctions, registerIpcFunctions } from "@/main/ipcFunctions";
import { useConfigSettings } from "@/main/provides/configs";
import { useLogger } from "@/main/provides/utils/logger";
import { usePaths } from "@/main/provides/utils/paths";
import { useWindows } from "@/main/provides/windows";
import { observeDarkMode } from "@/main/utils/darkMode";
import { checkAndNotifySoftwareUpdate } from "@/main/utils/softwareUpdater";
import { initWebhook } from "@/main/webhook";

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
      scheme: "app",
      privileges: {
        secure: true,
        standard: true,
      },
    },
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
      res({
        path: Path.resolve(paths.DIR_IMAGES, getLastSegmentFromURL(req.url)),
      });
    });
    protocol.registerFileProtocol(PROTOCOLS.FILE.IMAGE_THUMBNAIL, (req, res) => {
      res({
        path: Path.resolve(paths.DIR_THUMBNAILS, getLastSegmentFromURL(req.url)),
      });
    });
    // ipcの関数登録
    registerIpcFunctions();
    // protocol作成
    createProtocol("app");
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
