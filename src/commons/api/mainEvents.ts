import { ImportImageResult } from "@/commons/api/interfaces/importImageResult";
import { PetaImage } from "@/commons/datas/petaImage";

export interface MainEvents {
  updatePetaImages: () => void;
  updatePetaImage: (petaImage: PetaImage) => void;
  updatePetaTags: () => void;
  importImagesBegin: (fileCount: number) => void;
  importImagesProgress: (progress: number, file: string, result: ImportImageResult) => void;
  importImagesComplete: (fileCount: number, addedFileCount: number) => void;
  notifyUpdate: (current: string, latest: string) => void;
  windowFocused: (focused: boolean) => void;
  regenerateThumbnailsProgress: (done: number, count: number) => void;
  regenerateThumbnailsBegin: () => void;
  regenerateThumbnailsComplete: () => void;
}