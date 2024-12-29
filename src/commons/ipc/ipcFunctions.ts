import { AppInfo } from "@/commons/datas/appInfo";
import { GetPetaFileIdsParams } from "@/commons/datas/getPetaFileIdsParams";
import { ImportFileGroup } from "@/commons/datas/importFileGroup";
import { Libraries } from "@/commons/datas/libraries";
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
    browse: (type: "files" | "directories") => Promise<number>;
    import: (datas: ImportFileGroup[]) => Promise<string[]>;
  };
  tasks: {
    cancel: (ids: string[]) => Promise<void>;
    confirmFailed: (ids: string[]) => Promise<void>;
    getStatus: () => Promise<{ [id: string]: TaskStatusWithIndex }>;
  };
  petaFiles: {
    getAll: () => Promise<PetaFiles>;
    update: (datas: PetaFile[], mode: UpdateMode) => Promise<boolean>;
    getIDs: (params: GetPetaFileIdsParams) => Promise<string[]>;
    regenerate: () => Promise<void>;
  };
  petaBoards: {
    getAll: () => Promise<{ [petaBoardId: string]: PetaBoard }>;
    update: (boards: PetaBoard[], mode: UpdateMode) => Promise<boolean>;
  };
  petaTags: {
    getAll: () => Promise<PetaTag[]>;
    update: (tags: PetaTagLike[], mode: UpdateMode) => Promise<boolean>;
  };
  petaFilePetaTags: {
    getPetaTagIdsByPetaFileIds: (petaFileIds: string[]) => Promise<string[]>;
    getPetaTagCount: (petaTag: PetaTag) => Promise<number>;
    update: (
      petaFileIds: string[],
      petaTagLikes: PetaTagLike[],
      mode: UpdateMode,
    ) => Promise<boolean>;
  };
  petaTagPartitions: {
    getAll: () => Promise<PetaTagPartition[]>;
    update: (petaTagPartitions: PetaTagPartition[], mode: UpdateMode) => Promise<boolean>;
  };
  states: {
    get: () => Promise<States>;
    update: (states: States) => Promise<boolean>;
  };
  settings: {
    update: (settings: Settings) => Promise<boolean>;
    get: () => Promise<Settings>;
  };
  libraries: {
    update: (libraries: Libraries) => Promise<boolean>;
    get: () => Promise<Libraries>;
  };
  windows: {
    open: (windowName: WindowName) => Promise<void>;
    getMainWindowName: () => Promise<WindowName | undefined>;
    maximize: () => Promise<void>;
    minimize: () => Promise<void>;
    close: () => Promise<void>;
    activate: () => Promise<void>;
    reload: () => Promise<void>;
    toggleDevTools: () => Promise<void>;
  };
  modals: {
    open: (label: string, items: string[]) => Promise<number>;
    getAll: () => Promise<{ id: string; label: string; items: string[] }[]>;
    select: (id: string, index: number) => Promise<void>;
  };
  downloader: {
    open: (urls: PageDownloaderData[]) => Promise<void>;
    add: (urls: PageDownloaderData[]) => Promise<void>;
    getAll: () => Promise<PageDownloaderData[]>;
  };
  nsfw: {
    get: () => Promise<boolean>;
    set: (value: boolean) => Promise<void>;
  };
  details: {
    set: (petaFileId: string) => Promise<void>;
    get: () => Promise<PetaFile | undefined>;
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
    copyRawToClipboard: (petaFile: PetaFile) => Promise<boolean>;
    encodeVideo: (petaFiles: PetaFile[]) => Promise<boolean>;
    selectLibrary: (library: Libraries[string]) => Promise<boolean>;
  };
}
