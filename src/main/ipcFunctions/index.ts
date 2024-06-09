import { readFile } from "node:fs/promises";
import * as Path from "node:path";
import { app, desktopCapturer, dialog, ipcMain, nativeImage, screen, shell } from "electron";

import { AppInfo } from "@/commons/datas/appInfo";
import { MediaSourceInfo } from "@/commons/datas/mediaSourceInfo";
import { PageDownloaderData } from "@/commons/datas/pageDownloaderData";
import { createPetaBoard } from "@/commons/datas/petaBoard";
import { PetaFile } from "@/commons/datas/petaFile";
import {
  BOARD_DEFAULT_NAME,
  CHROME_EXTENSION_VERSION,
  EULA,
  FILENAME_DB_INFO,
  WEBHOOK_PORT,
} from "@/commons/defines";
import { IpcFunctionsType } from "@/commons/ipc/ipcFunctionsType";
import { ObjectKeys } from "@/commons/utils/objectKeys";
import { WindowName } from "@/commons/windows";

import { extraFiles } from "@/_defines/extraFiles";
import Transparent from "@/_public/images/utils/transparent.png";
import { showError } from "@/main/errorWindow";
import * as file from "@/main/libs/file";
import {
  useConfigSecureFilePassword,
  useConfigSettings,
  useConfigStates,
} from "@/main/provides/configs";
import { usePetaBoardsController } from "@/main/provides/controllers/petaBoardsController";
import { usePetaFilesController } from "@/main/provides/controllers/petaFilesController/petaFilesController";
import { usePetaFilesPetaTagsController } from "@/main/provides/controllers/petaFilesPetaTagsController";
import { usePetaTagPartitionsCOntroller } from "@/main/provides/controllers/petaTagPartitionsController";
import { usePetaTagsController } from "@/main/provides/controllers/petaTagsController";
import { useDBStatus } from "@/main/provides/databases";
import { useFileImporter } from "@/main/provides/fileImporter";
import { useModals } from "@/main/provides/modals";
import { usePageDownloaderCache } from "@/main/provides/pageDownloaderCache";
import { useTasks } from "@/main/provides/tasks";
import { TF } from "@/main/provides/tf";
import { LogFrom, useLogger } from "@/main/provides/utils/logger";
import { usePaths } from "@/main/provides/utils/paths";
import { useQuit } from "@/main/provides/utils/quit";
import { windowIs } from "@/main/provides/utils/windowIs";
import { useWebHook } from "@/main/provides/webhook";
import { EmitMainEventTargetType, useWindows } from "@/main/provides/windows";
import { getStyle } from "@/main/utils/darkMode";
import { getIPs } from "@/main/utils/getIPs";
import { getPetaFilePath } from "@/main/utils/getPetaFileDirectory";
import { isValidPetaFilePath } from "@/main/utils/isValidFilePath";
import { realESRGAN } from "@/main/utils/realESRGAN";
import { resolveExtraFilesPath } from "@/main/utils/resolveExtraFilesPath";
import { searchImageByGoogle } from "@/main/utils/searchImageByGoogle";
import { getLatestVersion } from "@/main/utils/versions";

let temporaryShowNSFW = false;
let detailsPetaFile: PetaFile | undefined;
let openInBrowserTargetID: string | undefined;
export const ipcFunctions: IpcFunctionsType = {
  importer: {
    async browse(event, logger, type) {
      const fileImporter = useFileImporter();
      const files = await fileImporter.browseFiles(event, type);
      logger.debug(files);
      return files;
    },
    async import(event, log, datas) {
      const fileImporter = useFileImporter();
      try {
        log.debug(datas.length, datas);
        const petaFileIds = await fileImporter.importFilesFromImportFileGroup(datas);
        log.debug("return:", petaFileIds.length);
        return petaFileIds;
      } catch (e) {
        log.error(e);
      }
      return [];
    },
  },
  tasks: {
    async cancel(event, logger, ids) {
      const tasks = useTasks();
      logger.debug(ids);
      tasks.cancel(ids);
      return;
    },
    async getStatus(event) {
      return useTasks().getStatus();
    },
    async confirmFailed(event, logger, ids) {
      const tasks = useTasks();
      logger.debug(ids);
      tasks.confirmFailed(ids);
      return;
    },
  },
  petaFiles: {
    async getAll(_, logger) {
      const petaFilesController = usePetaFilesController();
      try {
        const petaFiles = petaFilesController.getAllAsMap();
        logger.debug("return:", true);
        return petaFiles;
      } catch (e) {
        logger.error(e);
        showError({
          category: "M",
          code: 100,
          title: "Get PetaFiles Error",
          message: String(e),
        });
      }
      return {};
    },
    async update(event, logger, datas, mode) {
      const petaFilesController = usePetaFilesController();
      try {
        await petaFilesController.updateMultiple(datas, mode);
        logger.debug("return:", true);
        return true;
      } catch (err) {
        logger.error(err);
        showError({
          category: "M",
          code: 200,
          title: "Update PetaFiles Error",
          message: String(err),
        });
      }
      return false;
    },
    async regenerate(_, log) {
      const petaFilesController = usePetaFilesController();
      try {
        log.debug("start");
        await petaFilesController.regenerate();
        log.debug("end");
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
    async getIDs(event, log, params) {
      const petaFilesPetaTagsController = usePetaFilesPetaTagsController();
      try {
        log.debug("type:", params.type);
        const ids = await petaFilesPetaTagsController.getPetaFileIds(params);
        log.debug("return:", ids.length);
        return ids;
      } catch (error) {
        log.error(error);
        showError({
          category: "M",
          code: 100,
          title: "Get PetaFileIds Error",
          message: String(error),
        });
      }
      return [];
    },
  },
  petaBoards: {
    async getAll(_, logger) {
      const petaBoardsController = usePetaBoardsController();
      try {
        const petaBoards = await petaBoardsController.getAllAsMap();
        const length = Object.keys(petaBoards).length;
        if (length === 0) {
          logger.debug("no boards! create empty board");
          const style = getStyle();
          const board = createPetaBoard(
            BOARD_DEFAULT_NAME,
            0,
            style["--color-0"],
            style["--color-2"],
          );
          await petaBoardsController.updateMultiple([board], "insert");
          petaBoards[board.id] = board;
        }
        logger.debug("return:", length);
        return petaBoards;
      } catch (e) {
        logger.error(e);
        showError({
          category: "M",
          code: 100,
          title: "Get PetaBoards Error",
          message: String(e),
        });
      }
      return {};
    },
    async update(event, logger, boards, mode) {
      const petaBoardsController = usePetaBoardsController();
      try {
        await petaBoardsController.updateMultiple(boards, mode);
        logger.debug("return:", true);
        return true;
      } catch (e) {
        logger.error(e);
        showError({
          category: "M",
          code: 200,
          title: "Update PetaBoards Error",
          message: String(e),
        });
      }
      return false;
    },
  },
  petaTags: {
    async update(event, log, tags, mode) {
      const petaTagsController = usePetaTagsController();
      try {
        await petaTagsController.updateMultiple(tags, mode);
        log.debug("return:", true);
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
    async getAll(_, log) {
      const petaTagsController = usePetaTagsController();
      try {
        const petaTags = await petaTagsController.getAll();
        log.debug("return:", petaTags.length);
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
  },
  petaFilePetaTags: {
    async update(event, log, petaFileIds, petaTagLikes, mode) {
      const petaFilesPetaTagsController = usePetaFilesPetaTagsController();
      try {
        await petaFilesPetaTagsController.updatePetaFilesPetaTags(petaFileIds, petaTagLikes, mode);
        log.debug("return:", true);
        return true;
      } catch (error) {
        log.error(error);
        showError({
          category: "M",
          code: 200,
          title: "Update PetaFilesPetaTags Error",
          message: String(error),
        });
      }
      return false;
    },
    async getPetaTagIdsByPetaFileIds(event, log, petaFileIds) {
      const petaFilesPetaTagsController = usePetaFilesPetaTagsController();
      try {
        const petaTagIds =
          await petaFilesPetaTagsController.getPetaTagIdsByPetaFileIds(petaFileIds);
        return petaTagIds;
      } catch (error) {
        log.error(error);
        showError({
          category: "M",
          code: 100,
          title: "Get PetaTagIds By PetaFileIds Error",
          message: String(error),
        });
      }
      return [];
    },
    async getPetaTagCount(event, log, petaTag) {
      const petaFilesPetaTagsController = usePetaFilesPetaTagsController();
      try {
        const petaTagCount = await petaFilesPetaTagsController.getPetaTagCount(petaTag);
        log.debug("return:", petaTagCount);
        return petaTagCount;
      } catch (error) {
        log.error(error);
        showError({
          category: "M",
          code: 100,
          title: "Get PetaTagCounts Error",
          message: String(error),
        });
      }
      return -1;
    },
  },
  petaTagPartitions: {
    async update(event, log, partitions, mode) {
      const petaTagpartitionsController = usePetaTagPartitionsCOntroller();
      try {
        await petaTagpartitionsController.updateMultiple(partitions, mode);
        log.debug("return:", true);
        return true;
      } catch (error) {
        log.error(error);
        showError({
          category: "M",
          code: 200,
          title: "Update PetaFilesPetaTags Error",
          message: String(error),
        });
      }
      return false;
    },
    async getAll(_, log) {
      const petaTagpartitionsController = usePetaTagPartitionsCOntroller();
      try {
        const petaTagPartitions = await petaTagpartitionsController.getAll();
        log.debug("return:", petaTagPartitions.length);
        return petaTagPartitions;
      } catch (error) {
        log.error(error);
        showError({
          category: "M",
          code: 100,
          title: "Get PetaTagPartitions Error",
          message: String(error),
        });
      }
      return [];
    },
  },
  states: {
    async get(_, log) {
      const configStates = useConfigStates();
      log.debug(configStates.data);
      return configStates.data;
    },
    async update(event, log, states) {
      const configStates = useConfigStates();
      const windows = useWindows();
      try {
        configStates.data = states;
        configStates.save();
        windows.emitMainEvent({ type: "all" }, "updateStates", states);
        log.debug("return:", configStates.data);
        return true;
      } catch (e) {
        log.error(e);
      }
      return false;
    },
  },
  settings: {
    async update(event, log, settings) {
      const windows = useWindows();
      const configSettings = useConfigSettings();
      try {
        if (configSettings.data.web !== settings.web) {
          if (settings.web) {
            useWebHook().open(WEBHOOK_PORT);
          } else {
            useWebHook().close();
          }
        }
        configSettings.data = settings;
        Object.keys(windows.windows).forEach((key) => {
          const window = windows.windows[key as WindowName];
          if (windowIs.dead(window)) {
            return;
          }
        });
        configSettings.save();
        windows.emitMainEvent({ type: "all" }, "updateSettings", settings);
        windows.emitMainEvent({ type: "all" }, "showNSFW", getShowNSFW());
        windows.emitMainEvent({ type: "all" }, "style", getStyle());
        log.debug("return:", configSettings.data);
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
    async get(_, log) {
      const configSettings = useConfigSettings();
      log.debug("return:", configSettings.data);
      return configSettings.data;
    },
  },
  windows: {
    async getIsFocused(event, log) {
      const windows = useWindows();
      const isFocued = windows.getWindowByEvent(event)?.window.isFocused() ? true : false;
      log.debug("return:", isFocued);
      return isFocued;
    },
    async minimize(event, log) {
      const windows = useWindows();
      const windowInfo = windows.getWindowByEvent(event);
      windowInfo?.window.minimize();
      log.debug(windowInfo?.type);
    },
    async maximize(event, log) {
      const windows = useWindows();
      const windowInfo = windows.getWindowByEvent(event);
      if (windowInfo?.window.isMaximized()) {
        windowInfo?.window.unmaximize();
        return;
      }
      windowInfo?.window.maximize();
      log.debug(windowInfo?.type);
    },
    async close(event, log) {
      const windows = useWindows();
      const windowInfo = windows.getWindowByEvent(event);
      windowInfo?.window.close();
      log.debug(windowInfo?.type);
    },
    async activate(event, log) {
      const windows = useWindows();
      const windowInfo = windows.getWindowByEvent(event);
      windowInfo?.window.moveTop();
      windowInfo?.window.focus();
      log.debug(windowInfo?.type);
    },
    async toggleDevTools(event, log) {
      const windows = useWindows();
      const windowInfo = windows.getWindowByEvent(event);
      windowInfo?.window.webContents.toggleDevTools();
      log.debug(windowInfo?.type);
    },
    async open(event, log, windowName) {
      const windows = useWindows();
      openInBrowserTargetID = undefined;
      log.debug("type:", windowName);
      windows.openWindow(windowName, event);
    },
    async reload(event, log) {
      const windows = useWindows();
      const type = windows.reloadWindowByEvent(event);
      log.debug("type:", type);
    },
    async getMainWindowName(_, log) {
      const windows = useWindows();
      log.debug(windows.mainWindowName);
      return windows.mainWindowName;
    },
  },
  modals: {
    async open(event, log, label, items) {
      const index = await useModals().open(event, label, items);
      log.debug("return:", index);
      return index;
    },
    async select(_, log, id, index) {
      useModals().select(id, index);
      log.debug("return:", index);
    },
    async getAll(_, log) {
      const datas = useModals().getOrders();
      log.debug(datas);
      return datas;
    },
  },
  downloader: {
    async open(_, log, urls) {
      const windows = useWindows();
      _urls = urls;
      windows.openWindow("pageDownloader");
      usePageDownloaderCache().clear();
    },
    async add(_, log, urls) {
      _urls = [...urls, ..._urls];
      const windows = useWindows();
      windows.emitMainEvent(
        { type: "windowNames", windowNames: ["pageDownloader"] },
        "updatePageDownloaderDatas",
        _urls,
      );
    },
    async getAll() {
      return _urls;
    },
  },
  nsfw: {
    async get(_, log) {
      log.debug(getShowNSFW());
      return getShowNSFW();
    },
    async set(event, log, value) {
      log.debug(value);
      const windows = useWindows();
      temporaryShowNSFW = value;
      windows.emitMainEvent({ type: "all" }, "showNSFW", getShowNSFW());
    },
  },
  details: {
    async set(event, log, petaFileId: string) {
      const petaFilesController = usePetaFilesController();
      const windows = useWindows();
      log.debug(petaFileId);
      detailsPetaFile = await petaFilesController.getPetaFile(petaFileId);
      if (detailsPetaFile === undefined) {
        return;
      }
      windows.emitMainEvent(
        { type: "windowNames", windowNames: ["details"] },
        "detailsPetaFile",
        detailsPetaFile,
      );
      return;
    },
    async get(_, log) {
      log.debug(detailsPetaFile);
      return detailsPetaFile;
    },
  },
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
let _urls: PageDownloaderData[] = [];
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
function getShowNSFW() {
  const configSettings = useConfigSettings();
  return temporaryShowNSFW || configSettings.data.alwaysShowNSFW;
}
