import deepcopy from "deepcopy";
import { PetaColor } from "@/commons/datas/petaColor";
export interface PetaImage {
  file: {
    original: string;
    thumbnail: string;
  };
  name: string;
  fileDate: number;
  addDate: number;
  width: number;
  height: number;
  id: string;
  placeholder: string;
  palette: PetaColor[];
  note: string;
  nsfw: boolean;
  metadataVersion: number;
}
export type PetaImages = { [id: string]: PetaImage };
export function dbPetaImageToPetaImage(petaImage: PetaImage) {
  return petaImage;
}
export function dbPetaImagesToPetaImages(dbImages: PetaImages, copy = true) {
  const images = copy ? deepcopy(dbImages) : dbImages;
  Object.values(images).forEach((petaImage) => {
    dbPetaImageToPetaImage(petaImage);
  });
  return images;
}
export function petaImagesToDBPetaImages(images: PetaImages, copy = true) {
  const dbImages = copy ? deepcopy(images) : images;
  return dbImages;
}
export function petaImagesArrayToDBPetaImagesArray(images: PetaImage[], copy = true) {
  const dbImages = copy ? deepcopy(images) : images;
  return dbImages;
}
