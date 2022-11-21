import {
  app,
  dialog,
  IpcMainInvokeEvent,
  shell,
  nativeImage,
  desktopCapturer,
  screen,
} from "electron";
import * as Path from "path";
import { DEFAULT_BOARD_NAME, EULA } from "@/commons/defines";
import * as file from "@/main/storages/file";
import { PetaImage } from "@/commons/datas/petaImage";
import { createPetaBoard } from "@/commons/datas/petaBoard";
import { UpdateMode } from "@/commons/datas/updateMode";
import { ToMainFunctions } from "@/commons/ipc/toMainFunctions";
import { ImageType } from "@/commons/datas/imageType";
import { showError } from "@/main/errors/errorWindow";
import * as Tasks from "@/main/tasks/task";
import { getLatestVersion } from "@/commons/utils/versions";
import Transparent from "@/@assets/transparent.png";
// import { DraggingPreviewWindow } from "@/main/draggingPreviewWindow/draggingPreviewWindow";
import { WindowType } from "@/commons/datas/windowType";
import { searchImageByGoogle } from "@/main/utils/searchImageByGoogle";
import { ppa } from "@/commons/utils/pp";
import { ImportFileInfo } from "@/commons/datas/importFileInfo";
import { getURLFromHTML } from "@/renderer/utils/getURLFromHTML";
import { LogFrom, loggerKey } from "@/main/provides/utils/logger";
import { inject } from "@/main/utils/di";
import { petaImagesControllerKey } from "@/main/provides/controllers/petaImagesController";
import { petaTagsControllerKey } from "@/main/provides/controllers/petaTagsController";
import { petaTagPartitionsControllerKey } from "@/main/provides/controllers/petaTagPartitionsController";
import { petaBoardsControllerKey } from "@/main/provides/controllers/petaBoardsController";
import { pathsKey } from "@/main/provides/utils/paths";
import { dbStatusKey } from "@/main/provides/databases";
import { configSettingsKey, configStatesKey } from "@/main/provides/configs";
import { windowsKey } from "@/main/provides/utils/windows";
import { realESRGAN } from "@/main/utils/realESRGAN";
import { isDarkMode } from "@/main/utils/isDarkMode";
let temporaryShowNSFW = false;
let detailsPetaImage: PetaImage | undefined;
export function getMainFunctions(): {
  [P in keyof ToMainFunctions]: (
    event: IpcMainInvokeEvent,
    ...args: Parameters<ToMainFunctions[P]>
  ) => ReturnType<ToMainFunctions[P]>;
} {
  return {
    async browseAndImportImageFiles(event, type) {
      const logger = inject(loggerKey);
      const windows = inject(windowsKey);
      const petaImagesController = inject(petaImagesControllerKey);
      const log = logger.logMainChunk();
      log.log("#Browse Image Files");
      const windowInfo = windows.getWindowByEvent(event);
      if (windowInfo) {
        const result = await dialog.showOpenDialog(windowInfo.window, {
          properties: type === "files" ? ["openFile", "multiSelections"] : ["openDirectory"],
        });
        petaImagesController.importImagesFromFileInfos({
          fileInfos: result.filePaths.map((path) => ({ path })),
          extract: true,
        });
        return result.filePaths.length;
      }
      return 0;
    },
    async cancelTasks(event, ids) {
      const logger = inject(loggerKey);
      const log = logger.logMainChunk();
      try {
        log.log("#Cancel Tasks");
        ids.forEach((id) => {
          const name = Tasks.getTask(id)?.name;
          log.log(`task: ${name}-${id}`);
          Tasks.cancel(id);
        });
        return;
      } catch (error) {
        log.error(error);
      }
      return;
    },
    async getPetaImages() {
      const logger = inject(loggerKey);
      const petaImagesController = inject(petaImagesControllerKey);
      const log = logger.logMainChunk();
      try {
        log.log("#Get PetaImages");
        const petaImages = await petaImagesController.getPetaImages();
        log.log("return:", true);
        return petaImages;
      } catch (e) {
        log.error(e);
        showError({
          category: "M",
          code: 100,
          title: "Get PetaImages Error",
          message: String(e),
        });
      }
      return {};
    },
    async updatePetaImages(event, datas, mode) {
      const logger = inject(loggerKey);
      const petaImagesController = inject(petaImagesControllerKey);
      const log = logger.logMainChunk();
      try {
        log.log("#Update PetaImages");
        await petaImagesController.updatePetaImages(datas, mode);
        log.log("return:", true);
        return true;
      } catch (err) {
        log.error(err);
        showError({
          category: "M",
          code: 200,
          title: "Update PetaImages Error",
          message: String(err),
        });
      }
      return false;
    },
    async getPetaBoards() {
      const logger = inject(loggerKey);
      const petaBoardsController = inject(petaBoardsControllerKey);
      const log = logger.logMainChunk();
      try {
        log.log("#Get PetaBoards");
        const petaBoards = await petaBoardsController.getPetaBoards();
        const length = Object.keys(petaBoards).length;
        if (length === 0) {
          log.log("no boards! create empty board");
          const board = createPetaBoard(DEFAULT_BOARD_NAME, 0, isDarkMode());
          await petaBoardsController.updatePetaBoards([board], UpdateMode.INSERT);
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
      const logger = inject(loggerKey);
      const petaBoardsController = inject(petaBoardsControllerKey);
      const log = logger.logMainChunk();
      try {
        log.log("#Update PetaBoards");
        await petaBoardsController.updatePetaBoards(boards, mode);
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
      const logger = inject(loggerKey);
      const petaTagsController = inject(petaTagsControllerKey);
      const log = logger.logMainChunk();
      try {
        log.log("#Update PetaTags");
        await petaTagsController.updatePetaTags(tags, mode);
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
    async updatePetaImagesPetaTags(event, petaImageIds, petaTagLikes, mode) {
      const logger = inject(loggerKey);
      const petaTagsController = inject(petaTagsControllerKey);
      const log = logger.logMainChunk();
      try {
        log.log("#Update PetaImagesPetaTags");
        await petaTagsController.updatePetaImagesPetaTags(petaImageIds, petaTagLikes, mode);
        log.log("return:", true);
        return true;
      } catch (error) {
        log.error(error);
        showError({
          category: "M",
          code: 200,
          title: "Update PetaImagesPetaTags Error",
          message: String(error),
        });
      }
      return false;
    },
    async updatePetaTagPartitions(event, partitions, mode) {
      const logger = inject(loggerKey);
      const petaTagpartitionsController = inject(petaTagPartitionsControllerKey);
      const log = logger.logMainChunk();
      try {
        log.log("#Update PetaImagesPetaTags");
        await petaTagpartitionsController.updatePetaTagPartitions(partitions, mode);
        log.log("return:", true);
        return true;
      } catch (error) {
        log.error(error);
        showError({
          category: "M",
          code: 200,
          title: "Update PetaImagesPetaTags Error",
          message: String(error),
        });
      }
      return false;
    },
    async getPetaTagPartitions() {
      const logger = inject(loggerKey);
      const petaTagpartitionsController = inject(petaTagPartitionsControllerKey);
      const log = logger.logMainChunk();
      try {
        log.log("#Get PetaTagPartitions");
        const petaTagPartitions = await petaTagpartitionsController.getPetaTagPartitions();
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
    async getPetaImageIds(event, params) {
      const logger = inject(loggerKey);
      const petaTagsController = inject(petaTagsControllerKey);
      const log = logger.logMainChunk();
      try {
        log.log("#Get PetaImageIds");
        log.log("type:", params.type);
        const ids = await petaTagsController.getPetaImageIds(params);
        log.log("return:", ids.length);
        return ids;
      } catch (error) {
        log.error(error);
        showError({
          category: "M",
          code: 100,
          title: "Get PetaImageIds Error",
          message: String(error),
        });
      }
      return [];
    },
    async getPetaTagIdsByPetaImageIds(event, petaImageIds) {
      const logger = inject(loggerKey);
      const petaTagsController = inject(petaTagsControllerKey);
      const log = logger.logMainChunk();
      try {
        // log.log("#Get PetaTagIds By PetaImageIds");
        const petaTagIds = await petaTagsController.getPetaTagIdsByPetaImageIds(petaImageIds);
        // log.log("return:", petaTagIds.length);
        return petaTagIds;
      } catch (error) {
        log.error(error);
        showError({
          category: "M",
          code: 100,
          title: "Get PetaTagIds By PetaImageIds Error",
          message: String(error),
        });
      }
      return [];
    },
    async getPetaTags() {
      const logger = inject(loggerKey);
      const petaTagsController = inject(petaTagsControllerKey);
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
    async getPetaTagCounts() {
      const logger = inject(loggerKey);
      const petaTagsController = inject(petaTagsControllerKey);
      const log = logger.logMainChunk();
      try {
        log.log("#Get PetaTagCounts");
        const petaTagCounts = await petaTagsController.getPetaTagCounts();
        log.log("return:", Object.values(petaTagCounts).length);
        return petaTagCounts;
      } catch (error) {
        log.error(error);
        showError({
          category: "M",
          code: 100,
          title: "Get PetaTagCounts Error",
          message: String(error),
        });
      }
      return {};
    },
    async log(event, id: string, ...args: unknown[]) {
      const dataLogger = inject(loggerKey);
      dataLogger.log(LogFrom.RENDERER, id, ...args);
      return true;
    },
    async openURL(event, url) {
      const logger = inject(loggerKey);
      const log = logger.logMainChunk();
      log.log("#Open URL");
      log.log("url:", url);
      shell.openExternal(url);
      return true;
    },
    async openImageFile(event, petaImage) {
      const logger = inject(loggerKey);
      const petaImagesController = inject(petaImagesControllerKey);
      const log = logger.logMainChunk();
      log.log("#Open Image File");
      shell.showItemInFolder(petaImagesController.getImagePath(petaImage, ImageType.ORIGINAL));
    },
    async getAppInfo() {
      const logger = inject(loggerKey);
      const log = logger.logMainChunk();
      log.log("#Get App Info");
      const info = {
        name: app.getName(),
        version: app.getVersion(),
      };
      log.log("return:", info);
      return info;
    },
    async showDBFolder() {
      const logger = inject(loggerKey);
      const paths = inject(pathsKey);
      const log = logger.logMainChunk();
      log.log("#Show DB Folder");
      shell.showItemInFolder(paths.DIR_ROOT);
      return true;
    },
    async showConfigFolder() {
      const logger = inject(loggerKey);
      const paths = inject(pathsKey);
      const log = logger.logMainChunk();
      log.log("#Show Config Folder");
      shell.showItemInFolder(paths.DIR_APP);
      return true;
    },
    async showImageInFolder(event, petaImage) {
      const logger = inject(loggerKey);
      const petaImagesController = inject(petaImagesControllerKey);
      const log = logger.logMainChunk();
      log.log("#Show Image In Folder");
      shell.showItemInFolder(petaImagesController.getImagePath(petaImage, ImageType.ORIGINAL));
      return true;
    },
    async updateSettings(event, settings) {
      const logger = inject(loggerKey);
      const windows = inject(windowsKey);
      const configSettings = inject(configSettingsKey);
      const log = logger.logMainChunk();
      try {
        log.log("#Update Settings");
        configSettings.data = settings;
        Object.keys(windows.windows).forEach((key) => {
          const window = windows.windows[key as WindowType];
          if (window === undefined || window.isDestroyed()) {
            return;
          }
          window.setAlwaysOnTop(configSettings.data.alwaysOnTop);
        });
        configSettings.save();
        windows.emitMainEvent("updateSettings", settings);
        windows.emitMainEvent("showNSFW", getShowNSFW());
        windows.emitMainEvent("darkMode", isDarkMode());
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
      const logger = inject(loggerKey);
      const configSettings = inject(configSettingsKey);
      const log = logger.logMainChunk();
      log.log("#Get Settings");
      log.log("return:", configSettings.data);
      return configSettings.data;
    },
    async getWindowIsFocused(event) {
      const logger = inject(loggerKey);
      const windows = inject(windowsKey);
      const log = logger.logMainChunk();
      log.log("#Get Window Is Focused");
      const isFocued = windows.getWindowByEvent(event)?.window.isFocused() ? true : false;
      log.log("return:", isFocued);
      return isFocued;
    },
    async windowMinimize(event) {
      const logger = inject(loggerKey);
      const windows = inject(windowsKey);
      const log = logger.logMainChunk();
      log.log("#Window Minimize");
      windows.getWindowByEvent(event)?.window.minimize();
    },
    async windowMaximize(event) {
      const logger = inject(loggerKey);
      const windows = inject(windowsKey);
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
      const logger = inject(loggerKey);
      const windows = inject(windowsKey);
      const log = logger.logMainChunk();
      log.log("#Window Close");
      windows.getWindowByEvent(event)?.window.close();
    },
    async windowActivate(event) {
      const windows = inject(windowsKey);
      windows.getWindowByEvent(event)?.window.moveTop();
      windows.getWindowByEvent(event)?.window.focus();
    },
    async windowToggleDevTools(event) {
      const logger = inject(loggerKey);
      const windows = inject(windowsKey);
      const log = logger.logMainChunk();
      log.log("#Toggle Dev Tools");
      windows.getWindowByEvent(event)?.window.webContents.toggleDevTools();
    },
    async getPlatform() {
      const logger = inject(loggerKey);
      const log = logger.logMainChunk();
      log.log("#Get Platform");
      log.log("return:", process.platform);
      return process.platform;
    },
    async regenerateMetadatas() {
      const logger = inject(loggerKey);
      const petaImagesController = inject(petaImagesControllerKey);
      const log = logger.logMainChunk();
      try {
        log.log("#Regenerate Thumbnails");
        await petaImagesController.regenerateMetadatas();
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
    async browsePetaImageDirectory(event) {
      const logger = inject(loggerKey);
      const windows = inject(windowsKey);
      const log = logger.logMainChunk();
      log.log("#Browse PetaImage Directory");
      const windowInfo = windows.getWindowByEvent(event);
      if (windowInfo) {
        const filePath = (
          await dialog.showOpenDialog(windowInfo.window, {
            properties: ["openDirectory"],
          })
        ).filePaths[0];
        if (filePath === undefined) {
          return null;
        }
        let path = Path.resolve(filePath);
        if (Path.basename(path) != "PetaImage") {
          path = Path.resolve(path, "PetaImage");
        }
        log.log("return:", path);
        return path;
      }
      return "";
    },
    async changePetaImageDirectory(event, path) {
      const logger = inject(loggerKey);
      const paths = inject(pathsKey);
      const configSettings = inject(configSettingsKey);
      const log = logger.logMainChunk();
      try {
        log.log("#Change PetaImage Directory");
        path = Path.resolve(path);
        if (Path.resolve() === path) {
          log.error("Invalid file path:", path);
          return false;
        }
        if (paths.DIR_APP === path) {
          log.error("Invalid file path:", path);
          return false;
        }
        path = file.initDirectory(true, path);
        configSettings.data.petaImageDirectory.default = false;
        configSettings.data.petaImageDirectory.path = path;
        configSettings.save();
        relaunch();
        return true;
      } catch (error) {
        log.error(error);
      }
      return false;
    },
    async getStates() {
      const logger = inject(loggerKey);
      const configStates = inject(configStatesKey);
      const log = logger.logMainChunk();
      log.log("#Get States");
      return configStates.data;
    },
    async realESRGANConvert(event, petaImages, modelName) {
      const logger = inject(loggerKey);
      const log = logger.logMainChunk();
      try {
        log.log("#Real-ESRGAN Convert");
        const result = await realESRGAN(petaImages, modelName);
        log.log("return:", result);
        return result;
      } catch (error) {
        log.error(error);
      }
      return false;
    },
    async startDrag(event, petaImages) {
      const paths = inject(pathsKey);
      const windows = inject(windowsKey);
      const first = petaImages[0];
      if (!first) {
        return;
      }
      const firstPath = Path.resolve(paths.DIR_IMAGES, first.file.original);
      // draggingPreviewWindow.createWindow();
      // draggingPreviewWindow.setPetaImages(petaImages, configSettings.data.alwaysShowNSFW);
      // draggingPreviewWindow.setSize(iconSize, (first.height / first.width) * iconSize);
      // draggingPreviewWindow.setVisible(true);
      const files = petaImages.map((petaImage) =>
        Path.resolve(paths.DIR_IMAGES, petaImage.file.original),
      );
      if (windows.windows.board !== undefined && !windows.windows.board.isDestroyed()) {
        windows.windows.board.moveTop();
      }
      // draggingPreviewWindow.window?.moveTop();
      // await new Promise((res) => {
      //   setTimeout(res, 100);
      // });
      event.sender.startDrag({
        file: firstPath,
        files: files,
        icon: nativeImage.createFromDataURL(Transparent),
      });
      // draggingPreviewWindow.setVisible(false);
      // draggingPreviewWindow.destroy();
    },
    async updateStates(event, states) {
      const logger = inject(loggerKey);
      const windows = inject(windowsKey);
      const configStates = inject(configStatesKey);
      const log = logger.logMainChunk();
      try {
        log.log("#Update States");
        configStates.data = states;
        configStates.save();
        windows.emitMainEvent("updateStates", states);
        log.log("return:", configStates.data);
        return true;
      } catch (e) {
        log.error(e);
      }
      return false;
    },
    async importImages(event, datas) {
      const logger = inject(loggerKey);
      const paths = inject(pathsKey);
      const petaImagesController = inject(petaImagesControllerKey);
      const log = logger.logMainChunk();
      try {
        log.log("#importImages");
        log.log(datas.length);
        const logFromBrowser = logger.logMainChunk();
        const ids = datas
          .filter(
            (data) =>
              data[0]?.type === "filePath" &&
              Path.resolve(Path.dirname(data[0].filePath)) === Path.resolve(paths.DIR_IMAGES),
          )
          .map(
            (data) =>
              Path.basename(data[0]?.type === "filePath" ? data[0].filePath : "?").split(".")[0] ??
              "?",
          );
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
                };
              }
              if (d?.type === "url") {
                const result = await petaImagesController.createFileInfoFromURL(d.url);
                if (result !== undefined) {
                  return result;
                }
              }
              if (d?.type === "html") {
                const url = getURLFromHTML(d.html);
                if (url !== undefined) {
                  const result = await petaImagesController.createFileInfoFromURL(url);
                  if (result !== undefined) {
                    return result;
                  }
                }
              }
              if (d?.type === "buffer") {
                const result = await petaImagesController.createFileInfoFromBuffer(d.buffer);
                if (result !== undefined) {
                  return result;
                }
              }
            }
            return undefined;
          }, datas).promise
        ).filter((info) => info !== undefined) as ImportFileInfo[];
        const petaImageIds = (
          await petaImagesController.importImagesFromFileInfos({
            fileInfos,
            extract: true,
          })
        ).map((petaImage) => petaImage.id);
        log.log("return:", petaImageIds.length);
        return petaImageIds;
      } catch (e) {
        log.error(e);
      }
      return [];
    },
    async openWindow(event, windowType) {
      const logger = inject(loggerKey);
      const windows = inject(windowsKey);
      const log = logger.logMainChunk();
      log.log("#Open Window");
      log.log("type:", windowType);
      windows.openWindow(windowType, event);
    },
    async reloadWindow(event) {
      const logger = inject(loggerKey);
      const windows = inject(windowsKey);
      const log = logger.logMainChunk();
      log.log("#Reload Window");
      const type = windows.reloadWindowByEvent(event);
      log.log("type:", type);
    },
    async getMainWindowType() {
      const windows = inject(windowsKey);
      return windows.mainWindowType;
    },
    async getShowNSFW() {
      return getShowNSFW();
    },
    async setShowNSFW(event, value) {
      const windows = inject(windowsKey);
      temporaryShowNSFW = value;
      windows.emitMainEvent("showNSFW", getShowNSFW());
    },
    async searchImageByGoogle(event, petaImage) {
      const logger = inject(loggerKey);
      const paths = inject(pathsKey);
      const log = logger.logMainChunk();
      log.log("#Search Image By Google");
      try {
        await searchImageByGoogle(petaImage, paths.DIR_THUMBNAILS);
        log.log("return:", true);
        return true;
      } catch (error) {
        log.error(error);
      }
      return false;
    },
    async setDetailsPetaImage(event, petaImageId: string) {
      const windows = inject(windowsKey);
      const petaImagesController = inject(petaImagesControllerKey);
      detailsPetaImage = await petaImagesController.getPetaImage(petaImageId);
      if (detailsPetaImage === undefined) {
        return;
      }
      windows.emitMainEvent("detailsPetaImage", detailsPetaImage);
      return;
    },
    async getDetailsPetaImage() {
      return detailsPetaImage;
    },
    async getIsDarkMode() {
      return isDarkMode();
    },
    async getIsDataInitialized() {
      const dbStatus = inject(dbStatusKey);
      return dbStatus.initialized;
    },
    async getLatestVersion() {
      return getLatestVersion();
    },
    async eula(event, agree) {
      const logger = inject(loggerKey);
      const configSettings = inject(configSettingsKey);
      const log = logger.logMainChunk();
      log.log("#EULA");
      log.log(agree ? "agree" : "disagree", EULA);
      if (configSettings.data.eula === EULA) {
        return;
      }
      if (agree) {
        configSettings.data.eula = EULA;
        configSettings.save();
        relaunch();
      } else {
        app.quit();
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
  };
}
function getShowNSFW() {
  const configSettings = inject(configSettingsKey);
  return temporaryShowNSFW || configSettings.data.alwaysShowNSFW;
}
function relaunch() {
  app.relaunch();
  app.exit();
}
