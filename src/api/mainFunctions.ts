import { PetaBoard } from "@/datas/petaBoard";
import { PetaImage, PetaImages } from "@/datas/petaImage";
import { UpdateMode } from "@/datas/updateMode";
import { AppInfo } from "@/datas/appInfo";
import { Settings } from "@/datas/settings";

export interface MainFunctions {
  showMainWindow: () => Promise<void>;
  browseImages: () => Promise<number>;
  importImageFromURL: (url: string) => Promise<string>;
  importImagesFromFilePaths: (filePaths: string[]) => Promise<string[]>;
  getPetaImages: () => Promise<PetaImages>;
  savePetaImages: (datas: PetaImage[], mode: UpdateMode) => Promise<boolean>;
  getPetaBoards: () => Promise<PetaBoard[]>;
  savePetaBoards: (boards: PetaBoard[], mode: UpdateMode) => Promise<boolean>;
  log: (...args: any[]) => Promise<boolean>;
  dialog: (message: string, buttons: string[]) => Promise<number>;
  openURL: (url: string) => Promise<boolean>;
  openImageFile: (petaImage: PetaImage) => Promise<void>;
  getAppInfo: () => Promise<AppInfo>;
  showDBFolder: () => Promise<boolean>;
  showImageInFolder: (petaImage: PetaImage) => Promise<boolean>;
  checkUpdate: () => Promise<{ current: string, latest: string }>;
  updateSettings: (settings: Settings) => Promise<boolean>;
  getSettings: () => Promise<Settings>;
  getWindowIsFocused: () => Promise<boolean>;
  setZoomLevel: (level: number) => Promise<void>;
  windowMaximize: () => Promise<void>;
  windowMinimize: () => Promise<void>;
  windowClose: () => Promise<void>;
  getPlatform: () => Promise<NodeJS.Platform>;
  regenerateThumbnails: () => Promise<void>;
  browsePetaImageDirectory: () => Promise<string | null>;
  changePetaImageDirectory: (path: string) => Promise<boolean>;
  getImageFromClipboard: () => Promise<string>;
}