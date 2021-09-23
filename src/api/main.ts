import { PetaImage, PetaImageId, PetaImages, Board, UpdateMode, AppInfo } from '@/datas';
import { IpcMainInvokeEvent } from 'electron';
export interface Main {
  browseImages: () => Promise<number>;
  importImageFromURL: (url: string) => Promise<PetaImageId>;
  importImagesFromFilePaths: (filePaths: string[]) => Promise<PetaImageId[]>;
  // peta image
  getPetaImages: () => Promise<PetaImages>;
  getPetaImageBinary: (data: PetaImage, thumbnail?: boolean) => Promise<Buffer>;
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
}
export type MainFunctions = {
  [P in keyof Main]: (event: IpcMainInvokeEvent, ...args: Parameters<Main[P]>) => ReturnType<Main[P]>
};