import { ImportImageResult } from "@/datas/importImageResult";
import { PetaImage } from "@/datas/petaImage";

export interface Renderer {
  updatePetaImages: () => void;
  updatePetaImage: (petaImage: PetaImage) => void;
  updateTags: () => void;
  importImagesBegin: (fileCount: number) => void;
  importImagesProgress: (progress: number, file: string, result: ImportImageResult) => void;
  importImagesComplete: (fileCount: number, addedFileCount: number) => void;
  notifyUpdate: (current: string, latest: string) => void;
}