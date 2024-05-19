import { AppInfo } from "@/commons/datas/appInfo";
import { GetPetaFileIdsParams } from "@/commons/datas/getPetaFileIdsParams";
import { ImportFileGroup } from "@/commons/datas/importFileGroup";
import { MediaSourceInfo } from "@/commons/datas/mediaSourceInfo";
import { PetaBoard } from "@/commons/datas/petaBoard";
import { PetaFile, PetaFiles } from "@/commons/datas/petaFile";
import { PetaTag } from "@/commons/datas/petaTag";
import { PetaTagLike } from "@/commons/datas/petaTagLike";
import { PetaTagPartition } from "@/commons/datas/petaTagPartition";
import { RealESRGANModelName } from "@/commons/datas/realESRGANModelName";
import { RemoteBinaryInfo } from "@/commons/datas/remoteBinaryInfo";
import { Settings } from "@/commons/datas/settings";
import { States } from "@/commons/datas/states";
import { UpdateMode } from "@/commons/datas/updateMode";
import { WindowName } from "@/commons/windows";

import { Style } from "@/renderer/styles/styles";

export interface IpcFunctions {
  browseAndImportFiles: (type: "files" | "directories") => Promise<number>;
  importFiles: (datas: ImportFileGroup[]) => Promise<string[]>;
  cancelTasks: (ids: string[]) => Promise<void>;
  getPetaFiles: () => Promise<PetaFiles>;
  updatePetaFiles: (datas: PetaFile[], mode: UpdateMode) => Promise<boolean>;
  getPetaBoards: () => Promise<{ [petaBoardId: string]: PetaBoard }>;
  updatePetaBoards: (boards: PetaBoard[], mode: UpdateMode) => Promise<boolean>;
  updatePetaTags: (tags: PetaTagLike[], mode: UpdateMode) => Promise<boolean>;
  getPetaFileIds: (params: GetPetaFileIdsParams) => Promise<string[]>;
  getPetaTagIdsByPetaFileIds: (petaFileIds: string[]) => Promise<string[]>;
  getPetaTagCount: (petaTag: PetaTag) => Promise<number>;
  getPetaTags: () => Promise<PetaTag[]>;
  updatePetaFilesPetaTags: (
    petaFileIds: string[],
    petaTagLikes: PetaTagLike[],
    mode: UpdateMode,
  ) => Promise<boolean>;
  getPetaTagPartitions: () => Promise<PetaTagPartition[]>;
  updatePetaTagPartitions: (
    petaTagPartitions: PetaTagPartition[],
    mode: UpdateMode,
  ) => Promise<boolean>;
  log: (id: string, ...args: unknown[]) => Promise<boolean>;
  openURL: (url: string) => Promise<boolean>;
  openFile: (petaFile: PetaFile) => Promise<void>;
  getAppInfo: () => Promise<AppInfo>;
  getStates: () => Promise<States>;
  updateStates: (states: States) => Promise<boolean>;
  showDBFolder: () => Promise<boolean>;
  showConfigFolder: () => Promise<boolean>;
  showImageInFolder: (petaFile: PetaFile) => Promise<boolean>;
  updateSettings: (settings: Settings) => Promise<boolean>;
  getSettings: () => Promise<Settings>;
  getWindowIsFocused: () => Promise<boolean>;
  getMainWindowName: () => Promise<WindowName | undefined>;
  windowMaximize: () => Promise<void>;
  windowMinimize: () => Promise<void>;
  windowClose: () => Promise<void>;
  windowActivate: () => Promise<void>;
  getPlatform: () => Promise<NodeJS.Platform>;
  regeneratePetaFiles: () => Promise<void>;
  browsePetaFileDirectory: () => Promise<string | undefined>;
  changePetaFileDirectory: (path: string) => Promise<boolean>;
  realESRGANConvert: (petaFiles: PetaFile[], modelName: RealESRGANModelName) => Promise<string[]>;
  startDrag: (petaFiles: PetaFile[], iconSize: number, iconData: string) => Promise<void>;
  openWindow: (windowName: WindowName) => Promise<void>;
  openInBrowser: (petaFile: PetaFile | string) => Promise<void>;
  getOpenInBrowserID: () => Promise<string | undefined>;
  reloadWindow: () => Promise<void>;
  setDetailsPetaFile: (petaFileId: string) => Promise<void>;
  getDetailsPetaFile: () => Promise<PetaFile | undefined>;
  windowToggleDevTools: () => Promise<void>;
  getShowNSFW: () => Promise<boolean>;
  setShowNSFW: (value: boolean) => Promise<void>;
  searchImageByGoogle: (petaFile: PetaFile) => Promise<boolean>;
  getStyle: () => Promise<Style>;
  getIsDataInitialized: () => Promise<boolean>;
  getLatestVersion: () => Promise<RemoteBinaryInfo>;
  getMediaSources: () => Promise<MediaSourceInfo[]>;
  eula: (agree: boolean) => Promise<void>;
  getLicenses: () => Promise<{ name: string; licenses: string; text: string }[]>;
  getSupporters: () => Promise<{ [key: string]: string[] }>;
  openModal: (label: string, items: string[]) => Promise<number>;
  getModalDatas: () => Promise<{ id: string; label: string; items: string[] }[]>;
  selectModal: (id: string, index: number) => Promise<void>;
  getWebURL: () => Promise<{ [key: string]: string[] }>;
  getSimIDs: (id: string) => Promise<string[]>;
}
