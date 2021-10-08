import { PetaBoard } from '@/datas/petaBoard';
import { PetaImage, PetaImages } from '@/datas/petaImage';
import { UpdateMode } from '@/datas/updateMode';
import { AppInfo } from '@/datas/appInfo';
import { IpcMainInvokeEvent } from 'electron';
import { Settings } from '@/datas/settings';
import { ImageType } from '@/datas/imageType';
export interface Main {
  browseImages: () => Promise<number>;
  importImageFromURL: (url: string) => Promise<string>;
  importImagesFromFilePaths: (filePaths: string[]) => Promise<string[]>;
  // peta image
  getPetaImages: () => Promise<PetaImages>;
  getPetaImageBinary: (data: PetaImage, type: ImageType) => Promise<Buffer | null>;
  savePetaImages: (datas: PetaImage[], mode: UpdateMode) => Promise<boolean>;
  // boards
  getPetaBoards: () => Promise<PetaBoard[]>;
  savePetaBoards: (boards: PetaBoard[], mode: UpdateMode) => Promise<boolean>;
  // log
  log: (...args: any[]) => Promise<boolean>;
  // dialog
  dialog: (message: string, buttons: string[]) => Promise<number>;
  // openURL
  openURL: (url: string) => Promise<boolean>;
  // getAppInfo
  getAppInfo: () => Promise<AppInfo>;
  // showDBFolder
  showDBFolder: () => Promise<boolean>;
  // showImageInFolder
  showImageInFolder: (petaImage: PetaImage) => Promise<boolean>;
  // checkUpdate
  checkUpdate: () => Promise<{ current: string, latest: string }>;
  // updateSettings
  updateSettings: (settings: Settings) => Promise<boolean>;
  getSettings: () => Promise<Settings>;
  // getWindowIsFocused
  getWindowIsFocused: () => Promise<boolean>;
  // zoomLevel
  setZoomLevel: (level: number) => Promise<void>;
  // Window
  windowMaximize: () => Promise<void>;
  windowMinimize: () => Promise<void>;
  windowClose: () => Promise<void>;
  // platform
  getPlatform: () => Promise<NodeJS.Platform>;
  // alwaysOnTop
  // setAlwaysOnTop: (value: boolean) => Promise<void>;
}
export type MainFunctions = {
  [P in keyof Main]: (event: IpcMainInvokeEvent, ...args: Parameters<Main[P]>) => ReturnType<Main[P]>
};