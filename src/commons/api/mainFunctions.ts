import { PetaBoard } from "@/commons/datas/petaBoard";
import { PetaImage, PetaImages } from "@/commons/datas/petaImage";
import { UpdateMode } from "@/commons/api/interfaces/updateMode";
import { AppInfo } from "@/commons/datas/appInfo";
import { Settings } from "@/commons/datas/settings";
import { States } from "@/commons/datas/states";
import { PetaTag } from "@/commons/datas/petaTag";
import { PetaImagePetaTag } from "@/commons/datas/petaImagesPetaTags";
import { PetaTagInfo } from "@/commons/datas/petaTagInfo";

export interface MainFunctions {
  showMainWindow: () => Promise<void>;
  importImageFiles: () => Promise<number>;
  importImageDirectories: () => Promise<number>;
  importImageFromURL: (url: string) => Promise<string>;
  importImagesFromFilePaths: (filePaths: string[]) => Promise<string[]>;
  importImagesFromClipboard: (buffer: Buffer[]) => Promise<string[]>;
  cancelTasks: (ids: string[]) => Promise<void>;
  getPetaImages: () => Promise<PetaImages>;
  updatePetaImages: (datas: PetaImage[], mode: UpdateMode) => Promise<boolean>;
  getPetaBoards: () => Promise<PetaBoard[]>;
  updatePetaBoards: (boards: PetaBoard[], mode: UpdateMode) => Promise<boolean>;
  updatePetaTags: (tags: PetaTag[], mode: UpdateMode) => Promise<boolean>;
  getPetaImageIdsByPetaTagIds: (petaTagIds?: string[]) => Promise<string[]>;
  getPetaTagIdsByPetaImageIds: (petaImageIds: string[]) => Promise<string[]>;
  getPetaTagInfos: () => Promise<PetaTagInfo[]>;
  updatePetaImagesPetaTags: (petaImageIds: string[], petaTagIds: string[], mode: UpdateMode) => Promise<boolean>;
  log: (id: string, ...args: any[]) => Promise<boolean>;
  openURL: (url: string) => Promise<boolean>;
  openImageFile: (petaImage: PetaImage) => Promise<void>;
  getAppInfo: () => Promise<AppInfo>;
  getStates: () => Promise<States>;
  showDBFolder: () => Promise<boolean>;
  showConfigFolder: () => Promise<boolean>;
  showImageInFolder: (petaImage: PetaImage) => Promise<boolean>;
  updateSettings: (settings: Settings) => Promise<boolean>;
  getSettings: () => Promise<Settings>;
  getWindowIsFocused: () => Promise<boolean>;
  setZoomLevel: (level: number) => Promise<void>;
  windowMaximize: () => Promise<void>;
  windowMinimize: () => Promise<void>;
  windowClose: () => Promise<void>;
  getPlatform: () => Promise<NodeJS.Platform>;
  regenerateMetadatas: () => Promise<void>;
  browsePetaImageDirectory: () => Promise<string | null>;
  changePetaImageDirectory: (path: string) => Promise<boolean>;
  setSelectedPetaBoard: (petaBoardId: string) => Promise<void>;
  waifu2xConvert: (petaImages: PetaImage[]) => Promise<boolean>;
  installUpdate: () => Promise<boolean>;
  startDrag: (petaImages: PetaImage[], iconSize: number, iconData: string) => Promise<void>;
  getDropFromBrowserPetaImageIds: () => Promise<string[] | undefined>;
}