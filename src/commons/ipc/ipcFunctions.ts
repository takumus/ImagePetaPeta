import { AppInfo } from "@/commons/datas/appInfo";
import { GetPetaFileIdsParams } from "@/commons/datas/getPetaFileIdsParams";
import { ImportFileGroup } from "@/commons/datas/importFileGroup";
import { MediaSourceInfo } from "@/commons/datas/mediaSourceInfo";
import { PageDownloaderData } from "@/commons/datas/pageDownloaderData";
import { PetaBoard } from "@/commons/datas/petaBoard";
import { PetaFile, PetaFiles } from "@/commons/datas/petaFile";
import { PetaTag } from "@/commons/datas/petaTag";
import { PetaTagLike } from "@/commons/datas/petaTagLike";
import { PetaTagPartition } from "@/commons/datas/petaTagPartition";
import { RealESRGANModelName } from "@/commons/datas/realESRGANModelName";
import { RemoteBinaryInfo } from "@/commons/datas/remoteBinaryInfo";
import { Settings } from "@/commons/datas/settings";
import { States } from "@/commons/datas/states";
import { TaskStatus, TaskStatusWithIndex } from "@/commons/datas/task";
import { UpdateMode } from "@/commons/datas/updateMode";
import { WindowName } from "@/commons/windows";

import { Style } from "@/renderer/styles/styles";

export interface IpcFunctions {
  importer: {
    browseAndImportFiles: (type: "files" | "directories") => Promise<number>;
    importFiles: (datas: ImportFileGroup[]) => Promise<string[]>;
  };
  tasks: {
    cancelTasks: (ids: string[]) => Promise<void>;
    confirmFailedTasks: (ids: string[]) => Promise<void>;
    getTaskStatus: () => Promise<{ [id: string]: TaskStatusWithIndex }>;
  };
  petaFiles: {
    getPetaFiles: () => Promise<PetaFiles>;
    updatePetaFiles: (datas: PetaFile[], mode: UpdateMode) => Promise<boolean>;
    getPetaFileIds: (params: GetPetaFileIdsParams) => Promise<string[]>;
    regeneratePetaFiles: () => Promise<void>;
  };
  petaBoards: {
    getPetaBoards: () => Promise<{ [petaBoardId: string]: PetaBoard }>;
    updatePetaBoards: (boards: PetaBoard[], mode: UpdateMode) => Promise<boolean>;
  };
  petaTags: {
    getPetaTags: () => Promise<PetaTag[]>;
    updatePetaTags: (tags: PetaTagLike[], mode: UpdateMode) => Promise<boolean>;
  };
  petaFilePetaTags: {
    getPetaTagIdsByPetaFileIds: (petaFileIds: string[]) => Promise<string[]>;
    getPetaTagCount: (petaTag: PetaTag) => Promise<number>;
    updatePetaFilesPetaTags: (
      petaFileIds: string[],
      petaTagLikes: PetaTagLike[],
      mode: UpdateMode,
    ) => Promise<boolean>;
  };
  petaTagPartitions: {
    getPetaTagPartitions: () => Promise<PetaTagPartition[]>;
    updatePetaTagPartitions: (
      petaTagPartitions: PetaTagPartition[],
      mode: UpdateMode,
    ) => Promise<boolean>;
  };
  states: {
    getStates: () => Promise<States>;
    updateStates: (states: States) => Promise<boolean>;
  };
  settings: {
    updateSettings: (settings: Settings) => Promise<boolean>;
    getSettings: () => Promise<Settings>;
  };
  windows: {
    getWindowIsFocused: () => Promise<boolean>;
    openWindow: (windowName: WindowName) => Promise<void>;
    getMainWindowName: () => Promise<WindowName | undefined>;
    windowMaximize: () => Promise<void>;
    windowMinimize: () => Promise<void>;
    windowClose: () => Promise<void>;
    windowActivate: () => Promise<void>;
    reloadWindow: () => Promise<void>;
    windowToggleDevTools: () => Promise<void>;
  };
  modals: {
    openModal: (label: string, items: string[]) => Promise<number>;
    getModalDatas: () => Promise<{ id: string; label: string; items: string[] }[]>;
    selectModal: (id: string, index: number) => Promise<void>;
  };
  downloader: {
    openPageDownloader: (urls: PageDownloaderData[]) => Promise<void>;
    addPageDownloaderDatas: (urls: PageDownloaderData[]) => Promise<void>;
    getPageDownloaderDatas: () => Promise<PageDownloaderData[]>;
  };
  nsfw: {
    getShowNSFW: () => Promise<boolean>;
    setShowNSFW: (value: boolean) => Promise<void>;
  };
  details: {
    setDetailsPetaFile: (petaFileId: string) => Promise<void>;
    getDetailsPetaFile: () => Promise<PetaFile | undefined>;
  };
  common: {
    log: (id: string, ...args: unknown[]) => Promise<boolean>;
    openURL: (url: string) => Promise<boolean>;
    openFile: (petaFile: PetaFile) => Promise<void>;
    getAppInfo: () => Promise<AppInfo>;
    showDBFolder: () => Promise<boolean>;
    showConfigFolder: () => Promise<boolean>;
    showImageInFolder: (petaFile: PetaFile) => Promise<boolean>;
    getPlatform: () => Promise<NodeJS.Platform>;
    browsePetaFileDirectory: () => Promise<string | undefined>;
    changePetaFileDirectory: (path: string) => Promise<boolean>;
    realESRGANConvert: (petaFiles: PetaFile[], modelName: RealESRGANModelName) => Promise<string[]>;
    startDrag: (petaFiles: PetaFile[], iconSize: number, iconData: string) => Promise<void>;
    openInBrowser: (petaFile: PetaFile | string) => Promise<void>;
    getOpenInBrowserID: () => Promise<string | undefined>;
    searchImageByGoogle: (petaFile: PetaFile) => Promise<boolean>;
    getStyle: () => Promise<Style>;
    getIsDataInitialized: () => Promise<boolean>;
    getLatestVersion: () => Promise<RemoteBinaryInfo>;
    getMediaSources: () => Promise<MediaSourceInfo[]>;
    eula: (agree: boolean) => Promise<void>;
    getLicenses: () => Promise<{ name: string; licenses: string; text: string }[]>;
    getSupporters: () => Promise<{ [key: string]: string[] }>;
    getWebURL: () => Promise<{ [key: string]: string[] }>;
    getSimIDs: (id: string) => Promise<string[]>;
    getSimTags: (id: string) => Promise<{ tagId: string; prob: number }[]>;
    login: (password: string, save: boolean) => Promise<boolean>;
  };
}
