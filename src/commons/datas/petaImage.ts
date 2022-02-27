import deepcopy from "deepcopy";

export interface PetaImage {
  fileName: string,
  name: string,
  fileDate: number,
  addDate: number,
  width: number,
  height: number,
  id: string,
  placeholder: string,
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