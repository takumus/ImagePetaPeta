import { PetaBoard } from "@/commons/datas/petaBoard";
import { PetaImage, PetaImages } from "@/commons/datas/petaImage";
import { UpdateMode } from "@/commons/api/interfaces/updateMode";
import { AppInfo } from "@/commons/datas/appInfo";
import { Settings } from "@/commons/datas/settings";
import { States } from "@/commons/datas/states";
import { PetaTag } from "@/commons/datas/petaTag";
import { WindowType } from "@/commons/datas/windowType";
import { RemoteBinaryInfo } from "@/commons/datas/remoteBinaryInfo";
import { RealESRGANModelName } from "@/commons/datas/realESRGANModelName";
import { GetPetaImageIdsParams } from "@/commons/datas/getPetaImageIdsParams";
import { MediaSourceInfo } from "@/commons/datas/mediaSourceInfo";
export interface MainFunctions {
  browseAndImportImageFiles: (type: "files" | "directories") => Promise<number>;
  importImages: (datas: {
    htmls: string[];
    buffers: ArrayBuffer[];
    filePaths: string[];
  }) => Promise<string[]>;
  cancelTasks: (ids: string[]) => Promise<void>;
  getPetaImages: () => Promise<PetaImages>;
  updatePetaImages: (datas: PetaImage[], mode: UpdateMode) => Promise<boolean>;
  getPetaBoards: () => Promise<{ [petaBoardId: string]: PetaBoard }>;
  updatePetaBoards: (boards: PetaBoard[], mode: UpdateMode) => Promise<boolean>;
  updatePetaTags: (tags: PetaTag[], mode: UpdateMode) => Promise<boolean>;
  getPetaImageIds: (params: GetPetaImageIdsParams) => Promise<string[]>;
  getPetaTagIdsByPetaImageIds: (petaImageIds: string[]) => Promise<string[]>;
  getPetaTagCounts: () => Promise<{ [petaTagId: string]: number }>;
  getPetaTags: () => Promise<PetaTag[]>;
  updatePetaImagesPetaTags: (
    petaImageIds: string[],
    petaTagIds: string[],
    mode: UpdateMode,
  ) => Promise<boolean>;
  log: (id: string, ...args: unknown[]) => Promise<boolean>;
  openURL: (url: string) => Promise<boolean>;
  openImageFile: (petaImage: PetaImage) => Promise<void>;
  getAppInfo: () => Promise<AppInfo>;
  getStates: () => Promise<States>;
  updateStates: (states: States) => Promise<boolean>;
  showDBFolder: () => Promise<boolean>;
  showConfigFolder: () => Promise<boolean>;
  showImageInFolder: (petaImage: PetaImage) => Promise<boolean>;
  updateSettings: (settings: Settings) => Promise<boolean>;
  getSettings: () => Promise<Settings>;
  getWindowIsFocused: () => Promise<boolean>;
  getMainWindowType: () => Promise<WindowType | undefined>;
  windowMaximize: () => Promise<void>;
  windowMinimize: () => Promise<void>;
  windowClose: () => Promise<void>;
  windowActivate: () => Promise<void>;
  getPlatform: () => Promise<NodeJS.Platform>;
  regenerateMetadatas: () => Promise<void>;
  browsePetaImageDirectory: () => Promise<string | null>;
  changePetaImageDirectory: (path: string) => Promise<boolean>;
  realESRGANConvert: (petaImages: PetaImage[], modelName: RealESRGANModelName) => Promise<boolean>;
  startDrag: (petaImages: PetaImage[], iconSize: number, iconData: string) => Promise<void>;
  openWindow: (windowType: WindowType) => Promise<void>;
  reloadWindow: () => Promise<void>;
  setDetailsPetaImage: (petaImage: PetaImage) => Promise<void>;
  getDetailsPetaImage: () => Promise<PetaImage | undefined>;
  windowToggleDevTools: () => Promise<void>;
  getShowNSFW: () => Promise<boolean>;
  setShowNSFW: (value: boolean) => Promise<void>;
  searchImageByGoogle: (petaImage: PetaImage) => Promise<boolean>;
  getIsDarkMode: () => Promise<boolean>;
  getIsDataInitialized: () => Promise<boolean>;
  getLatestVersion: () => Promise<RemoteBinaryInfo>;
  getMediaSources: () => Promise<MediaSourceInfo[]>;
  eula: (agree: boolean) => Promise<void>;
}
