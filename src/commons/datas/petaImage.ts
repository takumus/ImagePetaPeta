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
  nsfw: boolean,
  _selected?: boolean
}
export type PetaImages = {[id: string]: PetaImage};
export function dbPetaImagesToPetaImages(dbImages: PetaImages, copy = true) {
  const images = copy ? deepcopy(dbImages) : dbImages;
  Object.values(images).forEach((image) => {
    image._selected = false;
  })
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