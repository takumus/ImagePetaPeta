import { readFile } from "node:fs/promises";
import * as Path from "node:path";
import { app, desktopCapturer, dialog, ipcMain, nativeImage, screen, shell } from "electron";

import { AppInfo } from "@/commons/datas/appInfo";
import { MediaSourceInfo } from "@/commons/datas/mediaSourceInfo";
import { CHROME_EXTENSION_VERSION, EULA, FILENAME_DB_INFO, WEBHOOK_PORT } from "@/commons/defines";
import { IpcFunctionsType } from "@/commons/ipc/ipcFunctionsType";
import { ObjectKeys } from "@/commons/utils/objectKeys";

import { extraFiles } from "@/_defines/extraFiles";
import Transparent from "@/_public/images/utils/transparent.png";
import { detailsIPCFunctions } from "@/main/ipcFunctions/details";
import { downloaderIPCFunctions } from "@/main/ipcFunctions/downloader";
import { importerIPCFunctions } from "@/main/ipcFunctions/importer";
import { modalsIPCFunctions } from "@/main/ipcFunctions/modals";
import { nsfwIPCFunctions } from "@/main/ipcFunctions/nsfw";
import { petaBoardsIPCFunctions } from "@/main/ipcFunctions/petaBoards";
import { petaFilePetaTagsIPCFunctions } from "@/main/ipcFunctions/petaFilePetaTags";
import { petaFilesIPCFunctions } from "@/main/ipcFunctions/petaFiles";
import { petaTagPartitionsIPCFunctions } from "@/main/ipcFunctions/petaTagPartitions";
import { petaTagsIPCFunctions } from "@/main/ipcFunctions/petaTags";
import { settingsIPCFunctions } from "@/main/ipcFunctions/settings";
import { statesIPCFunctions } from "@/main/ipcFunctions/states";
import { tasksIPCFunctions } from "@/main/ipcFunctions/tasks";
import { windowsIPCFunctions } from "@/main/ipcFunctions/windows";
import * as file from "@/main/libs/file";
import { useConfigSecureFilePassword, useConfigSettings } from "@/main/provides/configs";
import { usePetaFilesController } from "@/main/provides/controllers/petaFilesController/petaFilesController";
import { useDBStatus } from "@/main/provides/databases";
import { TF } from "@/main/provides/tf";
import { LogFrom, useLogger } from "@/main/provides/utils/logger";
import { usePaths } from "@/main/provides/utils/paths";
import { useQuit } from "@/main/provides/utils/quit";
import { windowIs } from "@/main/provides/utils/windowIs";
import { useWebHook } from "@/main/provides/webhook";
import { useWindows } from "@/main/provides/windows";
import { getStyle } from "@/main/utils/darkMode";
import { getIPs } from "@/main/utils/getIPs";
import { getPetaFilePath } from "@/main/utils/getPetaFileDirectory";
import { isValidPetaFilePath } from "@/main/utils/isValidFilePath";
import { realESRGAN } from "@/main/utils/realESRGAN";
import { resolveExtraFilesPath } from "@/main/utils/resolveExtraFilesPath";
import { searchImageByGoogle } from "@/main/utils/searchImageByGoogle";
import { getLatestVersion } from "@/main/utils/versions";

let openInBrowserTargetID: string | undefined;
export const ipcFunctions: IpcFunctionsType = {
  importer: importerIPCFunctions,
  tasks: tasksIPCFunctions,
  petaFiles: petaFilesIPCFunctions,
  petaBoards: petaBoardsIPCFunctions,
  petaTags: petaTagsIPCFunctions,
  petaFilePetaTags: petaFilePetaTagsIPCFunctions,
  petaTagPartitions: petaTagPartitionsIPCFunctions,
  states: statesIPCFunctions,
  settings: settingsIPCFunctions,
  windows: windowsIPCFunctions,
  modals: modalsIPCFunctions,
  downloader: downloaderIPCFunctions,
  nsfw: nsfwIPCFunctions,
  details: detailsIPCFunctions,
  common: {
    async openInBrowser(_, log, petaFile) {
      const windows = useWindows();
      openInBrowserTargetID = typeof petaFile === "string" ? petaFile : petaFile.id;
      log.debug(openInBrowserTargetID);
      windows.openWindow("browser");
      windows.emitMainEvent(
        { windowNames: ["browser"], type: "windowNames" },
        "openInBrowser",
        openInBrowserTargetID,
      );
    },
    async log(event, logger, id, ...args) {
      useLogger().log(LogFrom.RENDERER, id, ...args);
      return true;
    },
    async openURL(event, log, url) {
      shell.openExternal(url);
      return true;
    },
    async openFile(event, log, petaFile) {
      log.debug(petaFile.id);
      shell.showItemInFolder(getPetaFilePath.fromPetaFile(petaFile).original);
    },
    async getAppInfo(_, log) {
      const info: AppInfo = {
        name: app.getName(),
        version: app.getVersion(),
        chromeExtensionVersion: CHROME_EXTENSION_VERSION,
        electronVersion: process.versions.electron ?? "0.0.0",
        chromiumVersion: process.versions.chrome ?? "0.0.0",
        nodeVersion: process.versions.node ?? "0.0.0",
      };
      log.debug("return:", info);
      return info;
    },
    async showDBFolder(_, log) {
      const paths = usePaths();
      log.debug(paths.DIR_ROOT);
      shell.showItemInFolder(paths.DIR_ROOT);
      return true;
    },
    async showConfigFolder(_, log) {
      const paths = usePaths();
      log.debug(paths.DIR_APP);
      shell.showItemInFolder(paths.DIR_APP);
      return true;
    },
    async showImageInFolder(event, log, petaFile) {
      log.debug(petaFile.id);
      shell.showItemInFolder(getPetaFilePath.fromPetaFile(petaFile).original);
      return true;
    },
    async getPlatform(_, log) {
      log.debug("return:", process.platform);
      return process.platform;
    },
    async browsePetaFileDirectory(event, log) {
      const windows = useWindows();
      const windowInfo = windows.getWindowByEvent(event);
      if (windowInfo) {
        const filePath = (
          await dialog.showOpenDialog(windowInfo.window, {
            properties: ["openDirectory"],
          })
        ).filePaths[0];
        if (filePath === undefined) {
          return undefined;
        }
        let path = Path.resolve(filePath);
        // if (Path.basename(path) !== "PetaFile") {
        //   path = Path.resolve(path, "PetaFile");
        // }
        try {
          await readFile(Path.resolve(filePath, FILENAME_DB_INFO));
        } catch {
          path = Path.resolve(path, "PetaFile");
        }
        log.debug("return:", path);
        return path;
      }
      return "";
    },
    async changePetaFileDirectory(event, log, path) {
      const configSettings = useConfigSettings();
      try {
        path = Path.resolve(path);
        if (!isValidPetaFilePath(path)) {
          log.error("Invalid file path:", path);
          return false;
        }
        path = await file.initDirectory(true, path);
        configSettings.data.petaFileDirectory.default = false;
        configSettings.data.petaFileDirectory.path = path;
        configSettings.save();
        log.debug("true");
        useQuit().relaunch();
        return true;
      } catch (error) {
        log.error(error);
      }
      return false;
    },
    async realESRGANConvert(event, log, petaFiles, modelName) {
      try {
        log.debug("start");
        const result = (await realESRGAN(petaFiles, modelName)).map((petaFile) => petaFile.id);
        log.debug("end");
        log.debug("return:", result);
        return result;
      } catch (error) {
        log.error(error);
      }
      return [];
    },
    async startDrag(event, log, petaFiles) {
      const windows = useWindows();
      const first = petaFiles[0];
      if (!first) {
        return;
      }
      const firstPath = getPetaFilePath.fromPetaFile(first).original;
      const files = petaFiles.map((petaFile) => getPetaFilePath.fromPetaFile(petaFile).original);
      if (windowIs.alive("board")) {
        windows.windows.board?.moveTop();
      }
      log.debug(files.length);
      event.sender.startDrag({
        file: firstPath,
        files: files,
        icon: nativeImage.createFromDataURL(Transparent),
      });
    },
    async getOpenInBrowserID(_, log) {
      log.debug(openInBrowserTargetID);
      return openInBrowserTargetID;
    },
    async searchImageByGoogle(event, log, petaFile) {
      try {
        await searchImageByGoogle(getPetaFilePath.fromPetaFile(petaFile).thumbnail);
        log.debug("return:", true);
        return true;
      } catch (error) {
        log.error(error);
      }
      return false;
    },
    async getStyle(_, log) {
      const style = getStyle();
      log.debug(style);
      return style;
    },
    async getIsDataInitialized(_, log) {
      const dbStatus = useDBStatus();
      console.log(dbStatus.initialized);
      return dbStatus.initialized;
    },
    async getLatestVersion(_, log) {
      const version = await getLatestVersion();
      log.debug(version);
      return version;
    },
    async eula(event, log, agree) {
      const configSettings = useConfigSettings();
      const quit = useQuit();
      log.debug(agree ? "agree" : "disagree", EULA);
      if (configSettings.data.eula === EULA) {
        return;
      }
      if (agree) {
        configSettings.data.eula = EULA;
        configSettings.save();
        quit.relaunch();
      } else {
        quit.quit(true);
      }
    },
    async getMediaSources(_, log) {
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
      const sources: MediaSourceInfo[] = (
        await desktopCapturer.getSources({ types: ["screen"] })
      ).map((source) => ({
        name: source.name,
        id: source.id,
        thumbnailDataURL: source.thumbnail.toDataURL(),
        size: displaySizes[source.display_id],
      }));
      log.debug(sources);
      return sources;
    },
    async getLicenses(_, log) {
      log.debug(extraFiles["licenses.universal"]["licenses.json"]);
      return JSON.parse(
        (
          await readFile(resolveExtraFilesPath(extraFiles["licenses.universal"]["licenses.json"]))
        ).toString(),
      );
    },
    async getSupporters(_, log) {
      log.debug(extraFiles["supporters.universal"]["supporters.json"]);
      return JSON.parse(
        (
          await readFile(
            resolveExtraFilesPath(extraFiles["supporters.universal"]["supporters.json"]),
          )
        ).toString(),
      );
    },
    async getWebURL(_, log) {
      const ips = getIPs();
      Object.keys(ips).forEach((key) => {
        ips[key] = ips[key].map((ip) => {
          return `http://${ip}:${WEBHOOK_PORT}/web/?webAPIKey=${useWebHook().getAPIKEY()}`;
        });
      });
      log.debug(ips);
      return ips;
    },
    async getSimIDs(_, log, id) {
      try {
        const petaFile = await usePetaFilesController().getPetaFile(id);
        if (petaFile === undefined) {
          return [];
        }
        if (tf === undefined) {
          tf = new TF();
          await tf.init();
        }
        const _tf = tf;
        const scores = await _tf.getSimilarPetaFileIDsByPetaFile(petaFile);
        return scores.map((s) => s.id);
      } catch (err) {
        return [];
      }
    },
    async getSimTags(_, log, id) {
      try {
        const petaFile = await usePetaFilesController().getPetaFile(id);
        if (petaFile === undefined) {
          return [];
        }
        if (tf === undefined) {
          tf = new TF();
          await tf.init();
        }
        const _tf = tf;
        const scores = await _tf.getSimilarPetaTags(petaFile);
        return scores;
      } catch (err) {
        return [];
      }
    },
    async login(event, log, password, save) {
      log.debug(
        Array.from(Array(password.length).keys())
          .map(() => "*")
          .join(""),
        save,
      );
      await useConfigSecureFilePassword().setPassword(password, save);
      return true;
    },
  },
};
let tf: TF | undefined;
export function registerIpcFunctions() {
  ObjectKeys(ipcFunctions).forEach((category) => {
    ObjectKeys(ipcFunctions[category]).forEach((name) => {
      ipcMain.handle(`${category}.${name}`, (event, ...args) => {
        return (ipcFunctions[category][name] as any)(
          event,
          useLogger().logMainChunk(`${category}.${name}`),
          ...args,
        );
      });
    });
  });
}
