import deepcopy from "deepcopy";
import { PetaColor } from "./petaColor";
export interface PetaImage {
  file: {
    original: string
    thumbnail: string
  }
  name: string,
  fileDate: number,
  addDate: number,
  width: number,
  height: number,
  id: string,
  placeholder: string,
  palette: PetaColor[],
  note: "",
  nsfw: boolean,
  _selected?: boolean,
  metadataVersion: number
}
export type PetaImages = {[id: string]: PetaImage};
export function dbPetaImageToPetaImage(petaImage: PetaImage, selected = false) {
  petaImage._selected = selected;
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
  Object.values(dbImages).forEach((dbImage) => {
    dbImage._selected = undefined;
  })
  return dbImages;
}
export function petaImagesArrayToDBPetaImagesArray(images: PetaImage[], copy = true) {
  const dbImages = copy ? deepcopy(images) : images;
  dbImages.forEach((dbImage) => {
    dbImage._selected = undefined;
  })
  return dbImages;
}