import { PetaImage } from "@/datas/petaImage";
import { ImageType } from "@/datas/imageType";
function getImageURL(petaImage: PetaImage, type: ImageType) {
  const url = `image-${type}://${petaImage.fileName}`;
  return url;
}
export const ImageLoader = {
  getImageURL
}