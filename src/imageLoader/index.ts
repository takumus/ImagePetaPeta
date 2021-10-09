import { PetaImage } from "@/datas/petaImage";
import { ImageType } from "@/datas/imageType";
function getImageURL(petaImage: PetaImage, type: ImageType) {
  return `image-${type}://${petaImage.fileName}`;
}
export const ImageLoader = {
  getImageURL
}