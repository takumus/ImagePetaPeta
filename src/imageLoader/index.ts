import { PetaImage } from "@/datas";
import { API, log } from "@/api";
interface ImageCache {
  key: string
  url: string
}
class ImageCasher {
  cache: ImageCache[] = [];
  find(key: string) {
    const url = this.cache.find((c) => c.key == key);
    if (url) return url;
    return undefined;
  }
  add(key: string, buffer: Buffer) {
    let cache = this.find(key);
    if (cache) return cache;
    const url = window.URL.createObjectURL(new Blob([buffer]));
    cache = {
      key,
      url
    };
    this.cache.push(cache);
    return cache;
  }
  remove(key: string) {
    for (let i = 0; i < this.cache.length; i++) {
      if (key == this.cache[i].key) {
        window.URL.revokeObjectURL(this.cache[i].url);
        this.cache.splice(i, 1);
        return;
      }
    }
  }
  get length() {
    return this.cache.length;
  }
  trim(length: number) {
    if (this.cache.length - length < 0) return;
    this.cache.splice(0, this.cache.length - length).forEach((c) => {
      window.URL.revokeObjectURL(c.url);
    });
  }
}
const fullSizedCache = new ImageCasher();
const thumbnailCache = new ImageCasher();
let addFullsizedImage:(url: string) => void = () => {
  //
};
function getPetaImageKey(petaImage: PetaImage, thumbnail: boolean) {
  return petaImage.fileName;
}
// window.setInterval(() => {
//   log(`\nfullSizedCache: ${fullSizedCache.length}\nthumbnailCache: ${thumbnailCache.length}`);
// }, 1000);
async function getImageURL(petaImage: PetaImage, thumbnail = false) {
  const key = getPetaImageKey(petaImage, thumbnail);
  if (thumbnail) {
    const cache = thumbnailCache.find(key);
    if (cache) {
      return cache.url;
    }
  } else {
    const cache = fullSizedCache.find(key);
    if (cache) {
      return cache.url;
    }
  }
  const buffer = await API.send("getPetaImageBinary", petaImage, thumbnail);
  let cache: ImageCache;
  if (thumbnail) {
    cache = thumbnailCache.add(key, buffer);
  } else {
    cache = fullSizedCache.add(key, buffer);
    addFullsizedImage(cache.url);
  }
  return cache.url;
}
function removeImageURL(petaImage: PetaImage, thumbnail: boolean) {
  const key = getPetaImageKey(petaImage, thumbnail);
  if (thumbnail) {
    thumbnailCache.remove(key);
  } else {
    fullSizedCache.remove(key);
  }
}
function onAddFullsizedImage(callback: typeof addFullsizedImage) {
  addFullsizedImage = callback;
}
export const ImageLoader = {
  getImageURL,
  removeImageURL,
  onAddFullsizedImage
}