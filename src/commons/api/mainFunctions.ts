import { PetaBoard } from "@/commons/datas/petaBoard";
import { PetaImage, PetaImages } from "@/commons/datas/petaImage";
import { UpdateMode } from "@/commons/api/interfaces/updateMode";
import { AppInfo } from "@/commons/datas/appInfo";
import { Settings } from "@/commons/datas/settings";
import { States } from "@/commons/datas/states";
import { PetaTag } from "@/commons/datas/petaTag";
import { WindowType } from "@/commons/datas/windowType";
import { RemoteBinaryInfo } from "@/commons/datas/remoteBinaryInfo";
export interface MainFunctions {
  showMainWindow: () => Promise<void>;
  importImageFiles: () => Promise<number>;
  importImageDirectories: () => Promise<number>;
  importImagesFromClipboard: (buffer: Buffer[]) => Promise<string[]>;
  importImagesByDragAndDrop: (
    htmls: string[],
    buffers: ArrayBuffer[],
    filePaths: string[],
  ) => Promise<string[]>;
  cancelTasks: (ids: string[]) => Promise<void>;
  getPetaImages: () => Promise<PetaImages>;
  updatePetaImages: (datas: PetaImage[], mode: UpdateMode) => Promise<boolean>;
  getPetaBoards: () => Promise<{ [petaBoardId: string]: PetaBoard }>;
  updatePetaBoards: (boards: PetaBoard[], mode: UpdateMode) => Promise<boolean>;
  updatePetaTags: (tags: PetaTag[], mode: UpdateMode) => Promise<boolean>;
  getPetaImageIdsByPetaTagIds: (petaTagIds?: string[]) => Promise<string[]>;
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
  setZoomLevel: (level: number) => Promise<void>;
  windowMaximize: () => Promise<void>;
  windowMinimize: () => Promise<void>;
  windowClose: () => Promise<void>;
  windowActivate: () => Promise<void>;
  getPlatform: () => Promise<NodeJS.Platform>;
  regenerateMetadatas: () => Promise<void>;
  browsePetaImageDirectory: () => Promise<string | null>;
  changePetaImageDirectory: (path: string) => Promise<boolean>;
  realESRGANConvert: (petaImages: PetaImage[]) => Promise<boolean>;
  startDrag: (petaImages: PetaImage[], iconSize: number, iconData: string) => Promise<void>;
  getDropFromBrowserPetaImageIds: () => Promise<string[] | undefined>;
  openWindow: (windowType: WindowType) => Promise<void>;
  setDetailsPetaImage: (petaImage: PetaImage) => Promise<void>;
  getDetailsPetaImage: () => Promise<PetaImage | undefined>;
  windowToggleDevTools: () => Promise<void>;
  getShowNSFW: () => Promise<boolean>;
  setShowNSFW: (value: boolean) => Promise<void>;
  searchImageByGoogle: (petaImage: PetaImage) => Promise<boolean>;
  getIsDarkMode: () => Promise<boolean>;
  getIsDataInitialized: () => Promise<boolean>;
  getLatestVersion: () => Promise<RemoteBinaryInfo>;
}
