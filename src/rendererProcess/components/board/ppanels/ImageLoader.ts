import { ImageType } from "@/commons/datas/imageType";
import { PetaImage } from "@/commons/datas/petaImage";
import { getImageURL } from "@/rendererProcess/utils/imageURL";
import { AnimatedGIF } from "@/rendererProcess/utils/pixi-gif/AnimatedGIF";
import * as PIXI from "pixi.js";
let animatedGIFCache: { [key: string]: AnimatedGIF } = {};
export function clearAnimatedGIF() {
  Object.values(animatedGIFCache).forEach((cache) => {
    cache.destroy();
  });
  animatedGIFCache = {};
}
export function addAnimatedGIF(key: string, object: AnimatedGIF) {
  animatedGIFCache[key] = object;
  return animatedGIFCache[key];
}
export function getAnimatedGIF(key: string) {
  return animatedGIFCache[key];
}
export function getImage(petaImage: PetaImage | undefined) {
  let canceled = false;
  const cancelAnimatedGIFLoader = () => {
    //
  };
  let cancelResourcesLoader = (reason: string) => {
    reason;
    //
  };
  // const loader = new PIXI.Loader(undefined);
  // loader.use(async (resource, next) => {
  //   if (canceled) {
  //     next();
  //     return;
  //   }
  //   if (resource.extension === "gif") {
  //     const result = AnimatedGIF.fromBuffer(resource.data, undefined);
  //     cancelAnimatedGIFLoader = result.cancel;
  //     result.promise
  //       .then((data) => {
  //         resource.animation = data;
  //         next();
  //       })
  //       .catch(() => {
  //         next();
  //       });
  //     return;
  //   }
  //   next();
  // });
  const promise = new Promise<ImageLoaderResult>((res, rej) => {
    if (canceled) {
      rej("canceled");
      return;
    }
    cancelResourcesLoader = rej;
    if (!petaImage) {
      rej("petaImage is undefined");
      return;
    }
    const imageURL = getImageURL(petaImage, ImageType.ORIGINAL);
    const animatedGIF = getAnimatedGIF(imageURL);
    if (animatedGIF) {
      res({ animatedGIF: animatedGIF.clone() });
      return;
    }
    // const texture = PIXI.utils.TextureCache[imageURL];
    // if (texture?.baseTexture) {
    //   res({ texture });
    //   return;
    // }
    PIXI.Assets.load(imageURL)
      .then((resource) => {
        // const texture = resource?.texture;
        // const animatedGIF = resource?.animation as AnimatedGIF | undefined;
        console.log("ok:", resource);
        if (canceled) {
          // animatedGIF?.destroy();
          // resource?.destroy();
          rej("canceled");
          return;
        }
        if (resource instanceof AnimatedGIF) {
          // resource.autoUpdate = false;
          addAnimatedGIF(imageURL, resource);
          res({ animatedGIF: resource.clone() });
          return;
        }
        if (resource?.baseTexture) {
          res({ texture: resource });
          return;
        }
        rej("could not load texture");
      })
      .catch((reason) => {
        rej("could not load texture" + reason);
      });
    // loader.add(imageURL);
    // loader.onError.add((error) => {
    //   loader.resources[imageURL]?.texture?.destroy();
    //   rej("could not load texture" + error);
    // });
    // loader.load((_, resources) => {
    //   const resource = resources[imageURL];
    //   const texture = resource?.texture;
    //   // const animatedGIF = resource?.animation as AnimatedGIF | undefined;
    //   if (canceled) {
    //     // animatedGIF?.destroy();
    //     texture?.destroy();
    //     rej("canceled");
    //     return;
    //   }
    //   // if (animatedGIF) {
    //   //   animatedGIF.autoUpdate = false;
    //   //   addAnimatedGIF(imageURL, animatedGIF);
    //   //   res({ animatedGIF: animatedGIF.clone() });
    //   //   return;
    //   // }
    //   if (texture?.baseTexture) {
    //     res({ texture });
    //     return;
    //   }
    //   rej("could not load texture");
    // });
  });
  return {
    promise,
    cancel: () => {
      canceled = true;
      cancelAnimatedGIFLoader();
      cancelResourcesLoader("canceled");
      // loader.reset();
      // loader.destroy();
    },
  };
}
export interface ImageLoaderResult {
  texture?: PIXI.Texture;
  animatedGIF?: AnimatedGIF;
}
