import { API, log } from "@/api";
import { PetaImage } from "@/datas/petaImage";
import SampleImage from "@/assets/sample.png";
import { ImageType } from "@/datas/imageType";
const cacheURLs: string[] = [];
let updateFullsizedCache:(url: string[]) => void = () => {
  //
};
async function getImageURL(petaImage: PetaImage, type: ImageType) {
  // const key = getPetaImageKey(petaImage);
  const url = `image-${type}://${petaImage.fileName}`;
  // console.log(url, cacheURLs.indexOf(url));
  if (type == ImageType.FULLSIZED && cacheURLs.indexOf(url) < 0) {
    cacheURLs.push(url);
    updateFullsizedCache(cacheURLs);
  }
  return url;
}
function clearCache() {
  cacheURLs.splice(0, cacheURLs.length);
  updateFullsizedCache(cacheURLs);
}
function onUpdateFullsizedCache(callback: typeof updateFullsizedCache) {
  updateFullsizedCache = callback;
}
export const ImageLoader = {
  getImageURL,
  onUpdateFullsizedCache,
  clearCache
}