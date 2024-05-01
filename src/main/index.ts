import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { resolve } from "path";
import { app, protocol, ProtocolRequest, ProtocolResponse } from "electron";
import installExtension from "electron-devtools-installer";

import { PROTOCOLS, WEBHOOK_PORT } from "@/commons/defines";
import { getPetaFileInfoFromURL } from "@/commons/utils/getPetaFileInfoFromURL";

import { initDB } from "@/main/initDB";
import { initDI } from "@/main/initDI";
import { ipcFunctions, registerIpcFunctions } from "@/main/ipcFunctions";
import { useConfigSettings } from "@/main/provides/configs";
import { usePetaFilesController } from "@/main/provides/controllers/petaFilesController/petaFilesController";
import { useLogger } from "@/main/provides/utils/logger";
import { usePaths } from "@/main/provides/utils/paths";
import { useQuit } from "@/main/provides/utils/quit";
import { windowIs } from "@/main/provides/utils/windowIs";
import { useWebHook } from "@/main/provides/webhook";
import { useWindows } from "@/main/provides/windows";
import { observeDarkMode } from "@/main/utils/darkMode";
import { secureFile } from "@/main/utils/encryptFile";
import { getPetaFilePath } from "@/main/utils/getPetaFileDirectory";
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
      scheme: PROTOCOLS.FILE.IMAGE_ORIGINAL + "-file",
      privileges: {
        supportFetchAPI: true,
      },
    },
    {
      scheme: PROTOCOLS.FILE.IMAGE_ORIGINAL + "-stream",
      privileges: {
        supportFetchAPI: true,
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
    // プロトコル登録
    function fileProtocolHandler(
      type: "thumbnail" | "original",
    ): (
      request: ProtocolRequest,
      callback: (response: string | ProtocolResponse) => void,
    ) => Promise<void> {
      return async (req, res) => {
        const info = getPetaFileInfoFromURL(req.url);
        console.log("file", info.filename);
        const pf = await usePetaFilesController().getPetaFile(info.id);
        if (pf === undefined) {
          res({ path: "unknown" });
          return;
        }
        const path = getPetaFilePath.fromIDAndFilename(info.id, info.filename, type);
        if (pf.encrypt) {
          const decPath = resolve(usePaths().DIR_TEMP, info.filename);
          try {
            await stat(decPath);
            res({
              path: decPath,
            });
            return;
          } catch {
            await secureFile.decrypt.asFile(path, decPath, "1234");
            res({
              path: decPath,
            });
            return;
          }
        }
        res({
          path,
        });
      };
    }
    function streamProtocolHandler(
      type: "thumbnail" | "original",
    ): (
      request: ProtocolRequest,
      callback: (response: Electron.ProtocolResponse | NodeJS.ReadableStream) => void,
    ) => Promise<void> {
      return async (req, res) => {
        const info = getPetaFileInfoFromURL(req.url);
        console.log("stream", info.filename);
        const pf = await usePetaFilesController().getPetaFile(info.id);
        if (pf === undefined) {
          res({});
          return;
        }
        const path = getPetaFilePath.fromIDAndFilename(info.id, info.filename, type);
        if (pf.encrypt) {
          res(secureFile.decrypt.asStream(path, "1234"));
          return;
        }
        res(createReadStream(path));
      };
    }
    protocol.registerStreamProtocol(
      PROTOCOLS.FILE.IMAGE_ORIGINAL + "-stream",
      streamProtocolHandler("original"),
    );
    protocol.registerStreamProtocol(
      PROTOCOLS.FILE.IMAGE_THUMBNAIL + "-stream",
      streamProtocolHandler("thumbnail"),
    );
    protocol.registerFileProtocol(
      PROTOCOLS.FILE.IMAGE_ORIGINAL + "-file",
      fileProtocolHandler("original"),
    );
    // protocol.registerFileProtocol(PROTOCOLS.FILE.IMAGE_ORIGINAL, fileProtocolHandler("original"));
    // protocol.registerFileProtocol(PROTOCOLS.FILE.IMAGE_THUMBNAIL, fileProtocolHandler("thumbnail"));
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
  }
  app.on("ready", appReady);
})();
