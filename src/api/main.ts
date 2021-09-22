import { PetaImage, Category, PetaImageId, PetaImages, Board, BoardDB, Categories, ContextMenuItem, MenuType, UpdateMode } from '@/datas';
import { IpcMainInvokeEvent } from 'electron';
export interface Main {
  browseImages: () => Promise<number>;
  importImageFromURL: (url: string) => Promise<PetaImageId>;
  importImagesFromFilePaths: (filePaths: string[]) => Promise<PetaImageId[]>;
  // peta image
  getPetaImages: (categories: string[], order: string) => Promise<PetaImages>;
  getPetaImageBinary: (data: PetaImage, thumbnail?: boolean) => Promise<Buffer>;
  updatePetaImages: (datas: PetaImage[], mode: UpdateMode) => Promise<boolean>;
  // boards
  getBoards: () => Promise<BoardDB[]>;
  updateBoards: (boards: Board[], mode: UpdateMode) => Promise<boolean>;
  // log
  log: (...args: any[]) => Promise<boolean>;
  // dialog
  dialog: (message: string, buttons: string[]) => Promise<number>;
}
export type MainFunctions = {
  [P in keyof Main]: (event: IpcMainInvokeEvent, ...args: Parameters<Main[P]>) => ReturnType<Main[P]>
};