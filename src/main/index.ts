import * as mobilenet from "@tensorflow-models/mobilenet";
import * as tf from "@tensorflow/tfjs";

import "@tensorflow/tfjs-backend-wasm";

import { app, protocol } from "electron";
import installExtension from "electron-devtools-installer";

import { PROTOCOLS, WEBHOOK_PORT } from "@/commons/defines";

import { initDB } from "@/main/initDB";
import { initDI } from "@/main/initDI";
import { registerIpcFunctions } from "@/main/ipcFunctions";
import { useConfigSettings } from "@/main/provides/configs";
import { useHandleFileResponse } from "@/main/provides/handleFileResponse";
import { useLogger } from "@/main/provides/utils/logger";
import { windowIs } from "@/main/provides/utils/windowIs";
import { useWebHook } from "@/main/provides/webhook";
import { useWindows } from "@/main/provides/windows";
import { __main } from "@/main/sim";
import { observeDarkMode } from "@/main/utils/darkMode";
import { checkAndNotifySoftwareUpdate } from "@/main/utils/softwareUpdater";

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
  const windows = useWindows();
  const configSettings = useConfigSettings();
  const handleFileResponse = useHandleFileResponse();
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
  ]);
  // Macでドックアイコン押した時。
  app.on("activate", async () => {
    logger.logMainChunk().debug("$Electron event: activate");
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
    logger
      .logMainChunk()
      .debug(
        `\n####################################\n#-------APPLICATION LAUNCHED-------#\n####################################`,
      );
    logger.logMainChunk().debug(`verison: ${app.getVersion()}`);
    if (process.env.NODE_ENV === "development") {
      const log = logger.logMainChunk();
      try {
        log.debug("install vue devtools");
        await installExtension("nhdogjmejiglipccpnnnanhbledajbpd");
      } catch (error) {
        log.error(error);
      }
    }
    protocol.handle(PROTOCOLS.FILE.IMAGE_ORIGINAL, handleFileResponse.fileResponse("original"));
    protocol.handle(PROTOCOLS.FILE.IMAGE_THUMBNAIL, handleFileResponse.fileResponse("thumbnail"));
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
    if (configSettings.data.web) {
      await useWebHook().open(WEBHOOK_PORT);
    }
    // usePetaFilesController().verifyFiles();
    // useConfigSecureFilePassword().setValue("1234");
    // console.log(useConfigSecureFilePassword().getValue());
  }
  (async () => {
    await tf.setBackend("wasm");
    console.log("MODEL1");
    const model = await mobilenet.load();
    console.log("MODEL2");
    __main(model);
  })();
  app.on("ready", appReady);
})();
