import { readFile } from "fs/promises";
import * as Path from "path";
import { Tensor, Tensor1D } from "@tensorflow/tfjs";
import { app, desktopCapturer, dialog, ipcMain, nativeImage, screen, shell } from "electron";

import { AppInfo } from "@/commons/datas/appInfo";
import { ImportFileInfo } from "@/commons/datas/importFileInfo";
import { createPetaBoard } from "@/commons/datas/petaBoard";
import { PetaFile } from "@/commons/datas/petaFile";
import { UpdateMode } from "@/commons/datas/updateMode";
import {
  BOARD_DEFAULT_NAME,
  CHROME_EXTENSION_VERSION,
  EULA,
  FILENAME_DB_INFO,
  WEBHOOK_PORT,
} from "@/commons/defines";
import { IpcFunctionsType } from "@/commons/ipc/ipcFunctionsType";
import { CPU_LENGTH } from "@/commons/utils/cpu";
import { getIdsFromFilePaths } from "@/commons/utils/getIdsFromFilePaths";
import { ppa } from "@/commons/utils/pp";
import { WindowName } from "@/commons/windows";

import { extraFiles } from "@/_defines/extraFiles";
import Transparent from "@/_public/images/utils/transparent.png";
import { showError } from "@/main/errorWindow";
import * as file from "@/main/libs/file";
import { useConfigSettings, useConfigStates } from "@/main/provides/configs";
import { usePetaBoardsController } from "@/main/provides/controllers/petaBoardsController";
import { createFileInfo } from "@/main/provides/controllers/petaFilesController/createFileInfo";
import { usePetaFilesController } from "@/main/provides/controllers/petaFilesController/petaFilesController";
import { usePetaFilesPetaTagsController } from "@/main/provides/controllers/petaFilesPetaTagsController";
import { usePetaTagPartitionsCOntroller } from "@/main/provides/controllers/petaTagPartitionsController";
import { usePetaTagsController } from "@/main/provides/controllers/petaTagsController";
import { useDBStatus } from "@/main/provides/databases";
import { useModals } from "@/main/provides/modals";
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
import { getStreamFromPetaFile } from "@/main/utils/secureFile";
import { streamToBuffer } from "@/main/utils/streamToBuffer";
import { getLatestVersion } from "@/main/utils/versions";

let temporaryShowNSFW = false;
let detailsPetaFile: PetaFile | undefined;
let openInBrowserTargetID: string | undefined;
export const ipcFunctions: IpcFunctionsType = {
  async browseAndImportFiles(event, type) {
    const logger = useLogger();
    const windows = useWindows();
    const petaFilesController = usePetaFilesController();
    const log = logger.logMainChunk();
    log.debug("#Browse Image Files");
    const windowInfo = windows.getWindowByEvent(event);
    if (windowInfo) {
      const result = await dialog.showOpenDialog(windowInfo.window, {
        properties: type === "files" ? ["openFile", "multiSelections"] : ["openDirectory"],
      });
      petaFilesController.importFilesFromFileInfos({
        fileInfos: result.filePaths.map((path) => ({ path })),
        extract: true,
      });
      return result.filePaths.length;
    }
    return 0;
  },
  async cancelTasks(event, ids) {
    const logger = useLogger();
    const log = logger.logMainChunk();
    const tasks = useTasks();
    try {
      log.debug("#Cancel Tasks");
      ids.forEach((id) => {
        const name = tasks.getTask(id)?.name;
        log.debug(`task: ${name}-${id}`);
        tasks.cancel(id);
      });
      return;
    } catch (error) {
      log.error(error);
    }
    return;
  },
  async getPetaFiles() {
    const logger = useLogger();
    const petaFilesController = usePetaFilesController();
    const log = logger.logMainChunk();
    try {
      log.debug("#Get PetaFiles");
      const petaFiles = await petaFilesController.getAll();
      log.debug("return:", true);
      return petaFiles;
    } catch (e) {
      log.error(e);
      showError({
        category: "M",
        code: 100,
        title: "Get PetaFiles Error",
        message: String(e),
      });
    }
    return {};
  },
  async updatePetaFiles(event, datas, mode) {
    const logger = useLogger();
    const petaFilesController = usePetaFilesController();
    const log = logger.logMainChunk();
    try {
      log.debug("#Update PetaFiles");
      await petaFilesController.updateMultiple(datas, mode);
      log.debug("return:", true);
      return true;
    } catch (err) {
      log.error(err);
      showError({
        category: "M",
        code: 200,
        title: "Update PetaFiles Error",
        message: String(err),
      });
    }
    return false;
  },
  async getPetaBoards() {
    const logger = useLogger();
    const petaBoardsController = usePetaBoardsController();
    const log = logger.logMainChunk();
    try {
      log.debug("#Get PetaBoards");
      const petaBoards = await petaBoardsController.getAll();
      const length = Object.keys(petaBoards).length;
      if (length === 0) {
        log.debug("no boards! create empty board");
        const style = getStyle();
        const board = createPetaBoard(
          BOARD_DEFAULT_NAME,
          0,
          style["--color-0"],
          style["--color-2"],
        );
        await petaBoardsController.updateMultiple([board], UpdateMode.INSERT);
        petaBoards[board.id] = board;
      }
      log.debug("return:", length);
      return petaBoards;
    } catch (e) {
      log.error(e);
      showError({
        category: "M",
        code: 100,
        title: "Get PetaBoards Error",
        message: String(e),
      });
    }
    return {};
  },
  async updatePetaBoards(event, boards, mode) {
    const logger = useLogger();
    const petaBoardsController = usePetaBoardsController();
    const log = logger.logMainChunk();
    try {
      log.debug("#Update PetaBoards");
      await petaBoardsController.updateMultiple(boards, mode);
      log.debug("return:", true);
      return true;
    } catch (e) {
      log.error(e);
      showError({
        category: "M",
        code: 200,
        title: "Update PetaBoards Error",
        message: String(e),
      });
    }
    return false;
  },
  async updatePetaTags(event, tags, mode) {
    const logger = useLogger();
    const petaTagsController = usePetaTagsController();
    const log = logger.logMainChunk();
    try {
      log.debug("#Update PetaTags");
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
  async updatePetaFilesPetaTags(event, petaFileIds, petaTagLikes, mode) {
    const logger = useLogger();
    const petaFilesPetaTagsController = usePetaFilesPetaTagsController();
    const log = logger.logMainChunk();
    try {
      log.debug("#Update PetaFilesPetaTags");
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
  async updatePetaTagPartitions(event, partitions, mode) {
    const logger = useLogger();
    const petaTagpartitionsController = usePetaTagPartitionsCOntroller();
    const log = logger.logMainChunk();
    try {
      log.debug("#Update PetaFilesPetaTags");
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
  async getPetaTagPartitions() {
    const logger = useLogger();
    const petaTagpartitionsController = usePetaTagPartitionsCOntroller();
    const log = logger.logMainChunk();
    try {
      log.debug("#Get PetaTagPartitions");
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
  async getPetaFileIds(event, params) {
    const logger = useLogger();
    const petaFilesPetaTagsController = usePetaFilesPetaTagsController();
    const log = logger.logMainChunk();
    try {
      log.debug("#Get PetaFileIds");
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
  async getPetaTagIdsByPetaFileIds(event, petaFileIds) {
    const logger = useLogger();
    const petaFilesPetaTagsController = usePetaFilesPetaTagsController();
    const log = logger.logMainChunk();
    try {
      // log.log("#Get PetaTagIds By PetaFileIds");
      const petaTagIds = await petaFilesPetaTagsController.getPetaTagIdsByPetaFileIds(petaFileIds);
      // log.log("return:", petaTagIds.length);
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
  async getPetaTags() {
    const logger = useLogger();
    const petaTagsController = usePetaTagsController();
    const log = logger.logMainChunk();
    try {
      log.debug("#Get PetaTags");
      const petaTags = await petaTagsController.getPetaTags();
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
  async getPetaTagCount(event, petaTag) {
    const logger = useLogger();
    const petaFilesPetaTagsController = usePetaFilesPetaTagsController();
    const log = logger.logMainChunk();
    try {
      log.debug("#Get PetaTagCount");
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
  async log(event, id, ...args) {
    const dataLogger = useLogger();
    dataLogger.log(LogFrom.RENDERER, id, ...args);
    return true;
  },
  async openURL(event, url) {
    const logger = useLogger();
    const log = logger.logMainChunk();
    log.debug("#Open URL");
    log.debug("url:", url);
    shell.openExternal(url);
    return true;
  },
  async openFile(event, petaFile) {
    const logger = useLogger();
    const petaFilesController = usePetaFilesController();
    const log = logger.logMainChunk();
    log.debug("#Open Image File");
    shell.showItemInFolder(getPetaFilePath.fromPetaFile(petaFile).original);
  },
  async getAppInfo() {
    const logger = useLogger();
    const log = logger.logMainChunk();
    log.debug("#Get App Info");
    const info: AppInfo = {
      name: app.getName(),
      version: app.getVersion(),
      chromeExtensionVersion: CHROME_EXTENSION_VERSION,
      electronVersion: process.versions.electron ?? "1.0.0",
    };
    log.debug("return:", info);
    return info;
  },
  async showDBFolder() {
    const logger = useLogger();
    const paths = usePaths();
    const log = logger.logMainChunk();
    log.debug("#Show DB Folder");
    shell.showItemInFolder(paths.DIR_ROOT);
    return true;
  },
  async showConfigFolder() {
    const logger = useLogger();
    const paths = usePaths();
    const log = logger.logMainChunk();
    log.debug("#Show Config Folder");
    shell.showItemInFolder(paths.DIR_APP);
    return true;
  },
  async showImageInFolder(event, petaFile) {
    const logger = useLogger();
    const petaFilesController = usePetaFilesController();
    const log = logger.logMainChunk();
    log.debug("#Show Image In Folder");
    shell.showItemInFolder(getPetaFilePath.fromPetaFile(petaFile).original);
    return true;
  },
  async updateSettings(event, settings) {
    const logger = useLogger();
    const windows = useWindows();
    const configSettings = useConfigSettings();
    const log = logger.logMainChunk();
    try {
      log.debug("#Update Settings");
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
      windows.emitMainEvent({ type: EmitMainEventTargetType.ALL }, "updateSettings", settings);
      windows.emitMainEvent({ type: EmitMainEventTargetType.ALL }, "showNSFW", getShowNSFW());
      windows.emitMainEvent({ type: EmitMainEventTargetType.ALL }, "style", getStyle());
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
  async getSettings() {
    const logger = useLogger();
    const configSettings = useConfigSettings();
    const log = logger.logMainChunk();
    log.debug("#Get Settings");
    log.debug("return:", configSettings.data);
    return configSettings.data;
  },
  async getWindowIsFocused(event) {
    const logger = useLogger();
    const windows = useWindows();
    const log = logger.logMainChunk();
    log.debug("#Get Window Is Focused");
    const isFocued = windows.getWindowByEvent(event)?.window.isFocused() ? true : false;
    log.debug("return:", isFocued);
    return isFocued;
  },
  async windowMinimize(event) {
    const logger = useLogger();
    const windows = useWindows();
    const log = logger.logMainChunk();
    log.debug("#Window Minimize");
    windows.getWindowByEvent(event)?.window.minimize();
  },
  async windowMaximize(event) {
    const logger = useLogger();
    const windows = useWindows();
    const log = logger.logMainChunk();
    log.debug("#Window Maximize");
    const windowInfo = windows.getWindowByEvent(event);
    if (windowInfo?.window.isMaximized()) {
      windowInfo?.window.unmaximize();
      return;
    }
    windowInfo?.window.maximize();
  },
  async windowClose(event) {
    const logger = useLogger();
    const windows = useWindows();
    const log = logger.logMainChunk();
    log.debug("#Window Close");
    windows.getWindowByEvent(event)?.window.close();
  },
  async windowActivate(event) {
    const windows = useWindows();
    windows.getWindowByEvent(event)?.window.moveTop();
    windows.getWindowByEvent(event)?.window.focus();
  },
  async windowToggleDevTools(event) {
    const logger = useLogger();
    const windows = useWindows();
    const log = logger.logMainChunk();
    log.debug("#Toggle Dev Tools");
    windows.getWindowByEvent(event)?.window.webContents.toggleDevTools();
  },
  async getPlatform() {
    const logger = useLogger();
    const log = logger.logMainChunk();
    log.debug("#Get Platform");
    log.debug("return:", process.platform);
    return process.platform;
  },
  async regeneratePetaFiles() {
    const logger = useLogger();
    const petaFilesController = usePetaFilesController();
    const log = logger.logMainChunk();
    try {
      log.debug("#Regenerate Thumbnails");
      await petaFilesController.regeneratePetaFiles();
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
  async browsePetaFileDirectory(event) {
    const logger = useLogger();
    const windows = useWindows();
    const log = logger.logMainChunk();
    log.debug("#Browse PetaFile Directory");
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
  async changePetaFileDirectory(event, path) {
    const logger = useLogger();
    const paths = usePaths();
    const configSettings = useConfigSettings();
    const log = logger.logMainChunk();
    try {
      log.debug("#Change PetaFile Directory");
      path = Path.resolve(path);
      if (!isValidPetaFilePath(path)) {
        log.error("Invalid file path:", path);
        return false;
      }
      path = await file.initDirectory(true, path);
      configSettings.data.petaFileDirectory.default = false;
      configSettings.data.petaFileDirectory.path = path;
      configSettings.save();
      useQuit().relaunch();
      return true;
    } catch (error) {
      log.error(error);
    }
    return false;
  },
  async getStates() {
    const logger = useLogger();
    const configStates = useConfigStates();
    const log = logger.logMainChunk();
    log.debug("#Get States");
    return configStates.data;
  },
  async realESRGANConvert(event, petaFiles, modelName) {
    const logger = useLogger();
    const log = logger.logMainChunk();
    try {
      log.debug("#Real-ESRGAN Convert");
      const result = (await realESRGAN(petaFiles, modelName)).map((petaFile) => petaFile.id);
      log.debug("return:", result);
      return result;
    } catch (error) {
      log.error(error);
    }
    return [];
  },
  async startDrag(event, petaFiles) {
    const paths = usePaths();
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
    event.sender.startDrag({
      file: firstPath,
      files: files,
      icon: nativeImage.createFromDataURL(Transparent),
    });
  },
  async updateStates(event, states) {
    const logger = useLogger();
    const configStates = useConfigStates();
    const log = logger.logMainChunk();
    const windows = useWindows();
    try {
      log.debug("#Update States");
      configStates.data = states;
      configStates.save();
      windows.emitMainEvent({ type: EmitMainEventTargetType.ALL }, "updateStates", states);
      log.debug("return:", configStates.data);
      return true;
    } catch (e) {
      log.error(e);
    }
    return false;
  },
  async importFiles(event, datas) {
    const logger = useLogger();
    const petaFilesController = usePetaFilesController();
    const log = logger.logMainChunk();
    try {
      log.debug("#importFiles");
      log.debug(datas.length);
      const logFromBrowser = logger.logMainChunk();
      const ids = getIdsFromFilePaths(datas);
      logFromBrowser.debug("## From Browser");
      if (ids.length > 0 && ids.length === datas.length) {
        logFromBrowser.debug("return:", ids.length);
        return ids;
      } else {
        logFromBrowser.debug("return:", false);
      }
      const fileInfos = (
        await ppa(async (data): Promise<ImportFileInfo | undefined> => {
          for (let i = 0; i < data.length; i++) {
            console.log(data[i]);
            const d = data[i];
            switch (d.type) {
              case "filePath":
                return {
                  path: d.filePath,
                  ...d.additionalData,
                };
              case "url": {
                const result = await createFileInfo.fromURL(d.url, d.referrer, d.ua);
                if (result === undefined) return undefined;
                result.name = d.additionalData?.name ?? result.name;
                result.note = d.additionalData?.note ?? result.note;
                return result;
              }
              case "buffer": {
                const result = await createFileInfo.fromBuffer(d.buffer);
                if (result === undefined) return undefined;
                result.name = d.additionalData?.name ?? result.name;
                result.note = d.additionalData?.note ?? result.note;
                return result;
              }
            }
          }
          return undefined;
        }, datas).promise
      ).filter((info) => info !== undefined) as ImportFileInfo[];
      const petaFileIds = (
        await petaFilesController.importFilesFromFileInfos({
          fileInfos,
          extract: true,
        })
      ).map((petaFile) => petaFile.id);
      log.debug("return:", petaFileIds.length);
      return petaFileIds;
    } catch (e) {
      log.error(e);
    }
    return [];
  },
  async openWindow(event, windowName) {
    const logger = useLogger();
    const windows = useWindows();
    const log = logger.logMainChunk();
    openInBrowserTargetID = undefined;
    log.debug("#Open Window");
    log.debug("type:", windowName);
    windows.openWindow(windowName, event);
  },
  async openInBrowser(_event, petaFile) {
    const logger = useLogger();
    const windows = useWindows();
    const log = logger.logMainChunk();
    log.debug("#OpenBrowserAndOpenInBrowser");
    openInBrowserTargetID = typeof petaFile === "string" ? petaFile : petaFile.id;
    windows.openWindow("browser");
    windows.emitMainEvent(
      { windowNames: ["browser"], type: EmitMainEventTargetType.WINDOW_NAMES },
      "openInBrowser",
      openInBrowserTargetID,
    );
  },
  async getOpenInBrowserID() {
    return openInBrowserTargetID;
  },
  async reloadWindow(event) {
    const logger = useLogger();
    const windows = useWindows();
    const log = logger.logMainChunk();
    log.debug("#Reload Window");
    const type = windows.reloadWindowByEvent(event);
    log.debug("type:", type);
  },
  async getMainWindowName() {
    const windows = useWindows();
    return windows.mainWindowName;
  },
  async getShowNSFW() {
    return getShowNSFW();
  },
  async setShowNSFW(event, value) {
    const windows = useWindows();
    temporaryShowNSFW = value;
    windows.emitMainEvent({ type: EmitMainEventTargetType.ALL }, "showNSFW", getShowNSFW());
  },
  async searchImageByGoogle(event, petaFile) {
    const logger = useLogger();
    const paths = usePaths();
    const log = logger.logMainChunk();
    log.debug("#Search Image By Google");
    try {
      await searchImageByGoogle(getPetaFilePath.fromPetaFile(petaFile).thumbnail);
      log.debug("return:", true);
      return true;
    } catch (error) {
      log.error(error);
    }
    return false;
  },
  async setDetailsPetaFile(event, petaFileId: string) {
    const petaFilesController = usePetaFilesController();
    const windows = useWindows();
    detailsPetaFile = await petaFilesController.getPetaFile(petaFileId);
    if (detailsPetaFile === undefined) {
      return;
    }
    windows.emitMainEvent(
      { type: EmitMainEventTargetType.WINDOW_NAMES, windowNames: ["details"] },
      "detailsPetaFile",
      detailsPetaFile,
    );
    return;
  },
  async getDetailsPetaFile() {
    return detailsPetaFile;
  },
  async getStyle() {
    return getStyle();
  },
  async getIsDataInitialized() {
    const dbStatus = useDBStatus();
    return dbStatus.initialized;
  },
  async getLatestVersion() {
    return getLatestVersion();
  },
  async eula(event, agree) {
    const logger = useLogger();
    const configSettings = useConfigSettings();
    const log = logger.logMainChunk();
    const quit = useQuit();
    log.debug("#EULA");
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
  async getMediaSources() {
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
    return (await desktopCapturer.getSources({ types: ["screen"] })).map((source) => ({
      name: source.name,
      id: source.id,
      thumbnailDataURL: source.thumbnail.toDataURL(),
      size: displaySizes[source.display_id],
    }));
  },
  async getLicenses() {
    return JSON.parse(
      (
        await readFile(resolveExtraFilesPath(extraFiles["licenses.universal"]["licenses.json"]))
      ).toString(),
    );
  },
  async getSupporters() {
    return JSON.parse(
      (
        await readFile(resolveExtraFilesPath(extraFiles["supporters.universal"]["supporters.json"]))
      ).toString(),
    );
  },
  async openModal(event, label, items) {
    const logger = useLogger();
    const log = logger.logMainChunk();
    log.debug("#OpenModal");
    const index = await useModals().open(event, label, items);
    log.debug("return:", index);
    return index;
  },
  async selectModal(_, id, index) {
    const logger = useLogger();
    const log = logger.logMainChunk();
    log.debug("#SelectModal");
    useModals().select(id, index);
    log.debug("return:", index);
  },
  async getModalDatas() {
    return useModals().getOrders();
  },
  async getWebURL() {
    const ips = getIPs();
    Object.keys(ips).forEach((key) => {
      ips[key] = ips[key].map((ip) => {
        return `http://${ip}:${WEBHOOK_PORT}/web/?webAPIKey=${useWebHook().getAPIKEY()}`;
      });
    });
    return ips;
  },
  async getSimIDs(_, id) {
    try {
      console.time("sim");
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
      // console.log(scores);
      console.timeEnd("sim");
      await _tf.getSimilarPetaTags(petaFile);
      return scores.map((s) => s.id);
    } catch (err) {
      console.log(err);
      return [];
    }
  },
};
// let predictionModel: TF.Sequential | undefined;
let tf: TF | undefined;
export function registerIpcFunctions() {
  Object.keys(ipcFunctions).forEach((key) => {
    ipcMain.handle(key, ipcFunctions[key as keyof IpcFunctionsType]);
  });
}
function getShowNSFW() {
  const configSettings = useConfigSettings();
  return temporaryShowNSFW || configSettings.data.alwaysShowNSFW;
}
