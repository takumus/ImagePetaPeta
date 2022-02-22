import { PetaImage } from "@/datas/petaImage";
import { ImageType } from "@/datas/imageType";
export function getImageURL(petaImage: PetaImage, type: ImageType) {
  return `image-${type}://${petaImage.fileName}`;
}