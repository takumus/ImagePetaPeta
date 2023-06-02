import { app, desktopCapturer, dialog, ipcMain, nativeImage, screen, shell } from "electron";
import { readFile } from "fs/promises";
import * as Path from "path";
import { v4 as uuid } from "uuid";

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
} from "@/commons/defines";
import { IpcFunctionsType } from "@/commons/ipc/ipcFunctionsType";
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
import { useTasks } from "@/main/provides/tasks";
import { LogFrom, useLogger } from "@/main/provides/utils/logger";
import { usePaths } from "@/main/provides/utils/paths";
import { useQuit } from "@/main/provides/utils/quit";
import { EmitMainEventTargetType, useWindows } from "@/main/provides/windows";
import { isDarkMode } from "@/main/utils/darkMode";
import { getPetaFilePath } from "@/main/utils/getPetaFileDirectory";
import { isValidPetaFilePath } from "@/main/utils/isValidFilePath";
import { realESRGAN } from "@/main/utils/realESRGAN";
import { resolveExtraFilesPath } from "@/main/utils/resolveExtraFilesPath";
import { searchImageByGoogle } from "@/main/utils/searchImageByGoogle";
import { getLatestVersion } from "@/main/utils/versions";

let temporaryShowNSFW = false;
let detailsPetaFile: PetaFile | undefined;
let modalDatas: {
  id: string;
  label: string;
  items: string[];
  select: (index: number) => void;
}[] = [];
export const ipcFunctions: IpcFunctionsType = {
  async browseAndImportFiles(event, type) {
    const logger = useLogger();
    const windows = useWindows();
    const petaFilesController = usePetaFilesController();
    const log = logger.logMainChunk();
    log.log("#Browse Image Files");
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
      log.log("#Cancel Tasks");
      ids.forEach((id) => {
        const name = tasks.getTask(id)?.name;
        log.log(`task: ${name}-${id}`);
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
      log.log("#Get PetaFiles");
      const petaFiles = await petaFilesController.getAll();
      log.log("return:", true);
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
      log.log("#Update PetaFiles");
      await petaFilesController.updateMultiple(datas, mode);
      log.log("return:", true);
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
      log.log("#Get PetaBoards");
      const petaBoards = await petaBoardsController.getAll();
      const length = Object.keys(petaBoards).length;
      if (length === 0) {
        log.log("no boards! create empty board");
        const board = createPetaBoard(BOARD_DEFAULT_NAME, 0, isDarkMode());
        await petaBoardsController.updateMultiple([board], UpdateMode.INSERT);
        petaBoards[board.id] = board;
      }
      log.log("return:", length);
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
      log.log("#Update PetaBoards");
      await petaBoardsController.updateMultiple(boards, mode);
      log.log("return:", true);
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
      log.log("#Update PetaTags");
      await petaTagsController.updateMultiple(tags, mode);
      log.log("return:", true);
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
      log.log("#Update PetaFilesPetaTags");
      await petaFilesPetaTagsController.updatePetaFilesPetaTags(petaFileIds, petaTagLikes, mode);
      log.log("return:", true);
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
      log.log("#Update PetaFilesPetaTags");
      await petaTagpartitionsController.updateMultiple(partitions, mode);
      log.log("return:", true);
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
      log.log("#Get PetaTagPartitions");
      const petaTagPartitions = await petaTagpartitionsController.getAll();
      log.log("return:", petaTagPartitions.length);
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
      log.log("#Get PetaFileIds");
      log.log("type:", params.type);
      const ids = await petaFilesPetaTagsController.getPetaFileIds(params);
      log.log("return:", ids.length);
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
      log.log("#Get PetaTags");
      const petaTags = await petaTagsController.getPetaTags();
      log.log("return:", petaTags.length);
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
      log.log("#Get PetaTagCount");
      const petaTagCount = await petaFilesPetaTagsController.getPetaTagCount(petaTag);
      log.log("return:", petaTagCount);
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
    log.log("#Open URL");
    log.log("url:", url);
    shell.openExternal(url);
    return true;
  },
  async openFile(event, petaFile) {
    const logger = useLogger();
    const petaFilesController = usePetaFilesController();
    const log = logger.logMainChunk();
    log.log("#Open Image File");
    shell.showItemInFolder(getPetaFilePath.fromPetaFile(petaFile).original);
  },
  async getAppInfo() {
    const logger = useLogger();
    const log = logger.logMainChunk();
    log.log("#Get App Info");
    const info: AppInfo = {
      name: app.getName(),
      version: app.getVersion(),
      chromeExtensionVersion: CHROME_EXTENSION_VERSION,
      electronVersion: process.versions.electron ?? "1.0.0",
    };
    log.log("return:", info);
    return info;
  },
  async showDBFolder() {
    const logger = useLogger();
    const paths = usePaths();
    const log = logger.logMainChunk();
    log.log("#Show DB Folder");
    shell.showItemInFolder(paths.DIR_ROOT);
    return true;
  },
  async showConfigFolder() {
    const logger = useLogger();
    const paths = usePaths();
    const log = logger.logMainChunk();
    log.log("#Show Config Folder");
    shell.showItemInFolder(paths.DIR_APP);
    return true;
  },
  async showImageInFolder(event, petaFile) {
    const logger = useLogger();
    const petaFilesController = usePetaFilesController();
    const log = logger.logMainChunk();
    log.log("#Show Image In Folder");
    shell.showItemInFolder(getPetaFilePath.fromPetaFile(petaFile).original);
    return true;
  },
  async updateSettings(event, settings) {
    const logger = useLogger();
    const windows = useWindows();
    const configSettings = useConfigSettings();
    const log = logger.logMainChunk();
    try {
      log.log("#Update Settings");
      configSettings.data = settings;
      Object.keys(windows.windows).forEach((key) => {
        const window = windows.windows[key as WindowName];
        if (window === undefined || window.isDestroyed()) {
          return;
        }
        window.setAlwaysOnTop(configSettings.data.alwaysOnTop);
      });
      configSettings.save();
      windows.emitMainEvent({ type: EmitMainEventTargetType.ALL }, "updateSettings", settings);
      windows.emitMainEvent({ type: EmitMainEventTargetType.ALL }, "showNSFW", getShowNSFW());
      windows.emitMainEvent({ type: EmitMainEventTargetType.ALL }, "darkMode", isDarkMode());
      log.log("return:", configSettings.data);
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
    log.log("#Get Settings");
    log.log("return:", configSettings.data);
    return configSettings.data;
  },
  async getWindowIsFocused(event) {
    const logger = useLogger();
    const windows = useWindows();
    const log = logger.logMainChunk();
    log.log("#Get Window Is Focused");
    const isFocued = windows.getWindowByEvent(event)?.window.isFocused() ? true : false;
    log.log("return:", isFocued);
    return isFocued;
  },
  async windowMinimize(event) {
    const logger = useLogger();
    const windows = useWindows();
    const log = logger.logMainChunk();
    log.log("#Window Minimize");
    windows.getWindowByEvent(event)?.window.minimize();
  },
  async windowMaximize(event) {
    const logger = useLogger();
    const windows = useWindows();
    const log = logger.logMainChunk();
    log.log("#Window Maximize");
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
    log.log("#Window Close");
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
    log.log("#Toggle Dev Tools");
    windows.getWindowByEvent(event)?.window.webContents.toggleDevTools();
  },
  async getPlatform() {
    const logger = useLogger();
    const log = logger.logMainChunk();
    log.log("#Get Platform");
    log.log("return:", process.platform);
    return process.platform;
  },
  async regenerateMetadatas() {
    const logger = useLogger();
    const petaFilesController = usePetaFilesController();
    const log = logger.logMainChunk();
    try {
      log.log("#Regenerate Thumbnails");
      await petaFilesController.regenerateMetadatas();
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
    log.log("#Browse PetaFile Directory");
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
      log.log("return:", path);
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
      log.log("#Change PetaFile Directory");
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
    log.log("#Get States");
    return configStates.data;
  },
  async realESRGANConvert(event, petaFiles, modelName) {
    const logger = useLogger();
    const log = logger.logMainChunk();
    try {
      log.log("#Real-ESRGAN Convert");
      const result = (await realESRGAN(petaFiles, modelName)).map((petaFile) => petaFile.id);
      log.log("return:", result);
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
    if (windows.windows.board !== undefined && !windows.windows.board.isDestroyed()) {
      windows.windows.board.moveTop();
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
      log.log("#Update States");
      configStates.data = states;
      configStates.save();
      windows.emitMainEvent({ type: EmitMainEventTargetType.ALL }, "updateStates", states);
      log.log("return:", configStates.data);
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
      log.log("#importFiles");
      log.log(datas.length);
      const logFromBrowser = logger.logMainChunk();
      const ids = getIdsFromFilePaths(datas);
      logFromBrowser.log("## From Browser");
      if (ids.length > 0 && ids.length === datas.length) {
        logFromBrowser.log("return:", ids.length);
        return ids;
      } else {
        logFromBrowser.log("return:", false);
      }
      const fileInfos = (
        await ppa(async (data): Promise<ImportFileInfo | undefined> => {
          for (let i = 0; i < data.length; i++) {
            const d = data[i];
            if (d?.type === "filePath") {
              return {
                path: d.filePath,
                ...d.additionalData,
              };
            }
            if (d?.type === "url") {
              const result = await createFileInfo.fromURL(d.url, d.referrer);
              if (result !== undefined) {
                if (d.additionalData) {
                  result.name = d.additionalData.name ?? result.name;
                  result.note = d.additionalData.note ?? result.note;
                }
                return result;
              }
            }
            if (d?.type === "buffer") {
              const result = await createFileInfo.fromBuffer(d.buffer);
              if (result !== undefined) {
                if (d.additionalData) {
                  result.name = d.additionalData.name ?? result.name;
                  result.note = d.additionalData.note ?? result.note;
                }
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
      log.log("return:", petaFileIds.length);
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
    log.log("#Open Window");
    log.log("type:", windowName);
    windows.openWindow(windowName, event);
  },
  async openBrowserAndGotoPetaFile(_event, petaFile) {
    const logger = useLogger();
    const windows = useWindows();
    const log = logger.logMainChunk();
    log.log("#OpenBrowserAndGotoPetaFile");
    windows.openWindow("browser");
    windows.emitMainEvent(
      { windowNames: ["browser"], type: EmitMainEventTargetType.WINDOW_NAMES },
      "gotoPetaFile",
      petaFile,
    );
  },
  async reloadWindow(event) {
    const logger = useLogger();
    const windows = useWindows();
    const log = logger.logMainChunk();
    log.log("#Reload Window");
    const type = windows.reloadWindowByEvent(event);
    log.log("type:", type);
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
    log.log("#Search Image By Google");
    try {
      await searchImageByGoogle(getPetaFilePath.fromPetaFile(petaFile).thumbnail);
      log.log("return:", true);
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
  async getIsDarkMode() {
    return isDarkMode();
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
    log.log("#EULA");
    log.log(agree ? "agree" : "disagree", EULA);
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
    const windows = useWindows();
    const log = logger.logMainChunk();
    log.log("#OpenModal");
    return await new Promise<number>((res) => {
      const id = uuid();
      let selected = false;
      const modalData = {
        id,
        label,
        items,
        select(index: number) {
          if (selected) {
            return;
          }
          selected = true;
          log.log("return:", index);
          modalDatas = modalDatas.filter((modalData) => modalData.id !== id);
          windows.emitMainEvent(
            { type: EmitMainEventTargetType.WINDOW_NAMES, windowNames: ["modal"] },
            "updateModalDatas",
          );
          if (modalDatas.length === 0) {
            if (windows.windows.modal !== undefined && !windows.windows.modal.isDestroyed()) {
              windows.windows.modal?.close();
            }
          }
          res(index);
        },
      };
      modalDatas.push(modalData);
      windows.emitMainEvent(
        { type: EmitMainEventTargetType.WINDOW_NAMES, windowNames: ["modal"] },
        "updateModalDatas",
      );
      windows.openWindow("modal", event, true);
      windows.windows.modal?.on("closed", () => {
        modalData.select(-1);
      });
    });
  },
  async selectModal(_, id, index) {
    const logger = useLogger();
    const log = logger.logMainChunk();
    log.log("#SelectModal");
    log.log("return:", index);
    modalDatas.find((modal) => modal.id === id)?.select(index);
  },
  async getModalDatas() {
    return modalDatas.map((modalData) => ({
      id: modalData.id,
      items: modalData.items,
      label: modalData.label,
    }));
  },
};
export function registerIpcFunctions() {
  Object.keys(ipcFunctions).forEach((key) => {
    ipcMain.handle(key, ipcFunctions[key as keyof IpcFunctionsType]);
  });
}
function getShowNSFW() {
  const configSettings = useConfigSettings();
  return temporaryShowNSFW || configSettings.data.alwaysShowNSFW;
}
