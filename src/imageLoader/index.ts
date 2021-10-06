import { API, log } from "@/api";
import { PetaImage } from "@/datas/petaImage";
import SampleImage from "@/assets/sample.png";
interface ImageCache {
  key: string
  url: string
}
class ImageCacher {
  cache: ImageCache[] = [];
  find(key: string) {
    const url = this.cache.find((c) => c.key == key);
    if (url) return url;
    return undefined;
  }
  add(key: string, buffer: Buffer): Promise<ImageCache> {
    return new Promise((res, rej) => {
      let cache = this.find(key);
      if (cache) return cache;
      // const fr = new FileReader()
      // fr.addEventListener("load", (event) => {
      //   cache = {
      //     key,
      //     url: fr.result as string
      //   };
      //   this.cache.push(cache);
      //   res(cache);
      // });
      cache = {
        key,
        url: window.URL.createObjectURL(new Blob([buffer]))
      };
      this.cache.push(cache);
      res(cache);
    });
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
const fullSizedCache = new ImageCacher();
const thumbnailCache = new ImageCacher();
let updateFullsizedCache:(cache: ImageCacher) => void = () => {
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
  if (!buffer) {
    return SampleImage;
  }
  let cache: ImageCache;
  if (thumbnail) {
    cache = await thumbnailCache.add(key, buffer);
  } else {
    cache = await fullSizedCache.add(key, buffer);
    updateFullsizedCache(fullSizedCache);
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
function onUpdateFullsizedCache(callback: typeof updateFullsizedCache) {
  updateFullsizedCache = callback;
}
export const ImageLoader = {
  getImageURL,
  removeImageURL,
  onUpdateFullsizedCache,
  fullSizedCache,
  thumbnailCache
}