import { PetaImage } from "@/commons/datas/petaImage";
import { ImageType } from "@/commons/datas/imageType";
export function getImageURL(petaImage: PetaImage, type: ImageType) {
  return `image-${type}://${type == ImageType.ORIGINAL ? petaImage.file.original : petaImage.file.thumbnail}`;
}