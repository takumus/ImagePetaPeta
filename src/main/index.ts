import { app, ipcMain, protocol, session } from "electron";
import * as Path from "path";
import { createProtocol } from "vue-cli-plugin-electron-builder/lib";

import { PROTOCOLS } from "@/commons/defines";

import { showError } from "@/main/errors/errorWindow";
import { initDB } from "@/main/initDB";
import { initDI } from "@/main/initDI";
import { getIpcFunctions } from "@/main/ipcFunctions";
import { useConfigSettings } from "@/main/provides/configs";
import { useDBStatus } from "@/main/provides/databases";
import { useLogger } from "@/main/provides/utils/logger";
import { usePaths } from "@/main/provides/utils/paths";
import { EmitMainEventTargetType, useWindows } from "@/main/provides/utils/windows";
import { observeDarkMode } from "@/main/utils/darkMode";
import { emitMainEvent } from "@/main/utils/emitMainEvent";
import { checkAndNotifySoftwareUpdate } from "@/main/utils/softwareUpdater";
import { initWebhook } from "@/main/webhook/webhook";

(() => {
  if (!app.requestSingleInstanceLock()) {
    app.quit();
    return;
  }
  // DI準備
  if (!initDI(showError)) {
    return;
  }
  const logger = useLogger();
  const paths = usePaths();
  const windows = useWindows();
  const configSettings = useConfigSettings();
  const dbStatus = useDBStatus();
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
    session.defaultSession.protocol.registerFileProtocol(
      PROTOCOLS.FILE.IMAGE_ORIGINAL,
      (req, res) => {
        res({
          path: Path.resolve(paths.DIR_IMAGES, req.url.split("/").pop() as string),
        });
      },
    );
    session.defaultSession.protocol.registerFileProtocol(
      PROTOCOLS.FILE.IMAGE_THUMBNAIL,
      (req, res) => {
        res({
          path: Path.resolve(paths.DIR_THUMBNAILS, req.url.split("/").pop() as string),
        });
      },
    );
    // ipcの関数登録
    const ipcFunctions = getIpcFunctions();
    Object.keys(ipcFunctions).forEach((key) => {
      ipcMain.handle(key, ipcFunctions[key as keyof typeof ipcFunctions]);
    });
    createProtocol("app");
    // 初期ウインドウ表示
    windows.showWindows();
    // ダークモード監視開始
    observeDarkMode();
    // アップデート確認と通知
    checkAndNotifySoftwareUpdate();
    // dbの初期化
    await initDB();
    // データ初期化完了通知
    dbStatus.initialized = true;
    emitMainEvent({ type: EmitMainEventTargetType.ALL }, "dataInitialized");
    // webhook有効化
    if (configSettings.data.developerMode) {
      initWebhook(ipcFunctions);
    }
  }
  app.on("ready", appReady);
})();
