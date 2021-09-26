import { Board } from '@/datas/board';
import { PetaImage, PetaImages } from '@/datas/petaImage';
import { UpdateMode } from '@/datas/updateMode';
import { AppInfo } from '@/datas/appInfo';
import { IpcMainInvokeEvent } from 'electron';
export interface Main {
  browseImages: () => Promise<number>;
  importImageFromURL: (url: string) => Promise<string>;
  importImagesFromFilePaths: (filePaths: string[]) => Promise<string[]>;
  // peta image
  getPetaImages: () => Promise<PetaImages>;
  getPetaImageBinary: (data: PetaImage, thumbnail?: boolean) => Promise<Buffer | null>;
  updatePetaImages: (datas: PetaImage[], mode: UpdateMode) => Promise<boolean>;
  // boards
  getBoards: () => Promise<Board[]>;
  updateBoards: (boards: Board[], mode: UpdateMode) => Promise<boolean>;
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
}
export type MainFunctions = {
  [P in keyof Main]: (event: IpcMainInvokeEvent, ...args: Parameters<Main[P]>) => ReturnType<Main[P]>
};