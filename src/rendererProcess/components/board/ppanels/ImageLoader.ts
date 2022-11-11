import { ImageType } from "@/commons/datas/imageType";
import { PetaImage } from "@/commons/datas/petaImage";
import { getImageURL } from "@/rendererProcess/utils/imageURL";
import { AnimatedGIF } from "@/rendererProcess/utils/pixi-gif/AnimatedGIF";
import { AnimatedGIFResource } from "@/rendererProcess/utils/pixi-gif/AnimatedGIFResource";
import * as PIXI from "pixi.js";

export function getImage(petaImage: PetaImage | undefined) {
  let canceled = false;
  let cancelAnimatedGIFLoader = () => {
    //
  };
  let cancelResourcesLoader = (reason: string) => {
    reason;
  };
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
    PIXI.Assets.load(imageURL)
      .then(async (resource) => {
        if (canceled) {
          rej("canceled");
          return;
        }
        if (resource instanceof AnimatedGIFResource) {
          cancelAnimatedGIFLoader = resource.cancel;
          try {
            const animatedGIFResource = await resource.load();
            res({ animatedGIF: animatedGIFResource.getNewAnimatedGIF() });
            return;
          } catch (reason) {
            rej("AnimatedGIFResource error:" + reason);
          }
          return;
        }
        if (resource instanceof PIXI.Texture) {
          res({ texture: resource });
          return;
        }
        rej(`unknown resource: ${imageURL}`);
      })
      .catch((reason) => {
        rej(`could not load resource: ${reason}`);
      });
  });
  return {
    promise,
    cancel: () => {
      canceled = true;
      cancelAnimatedGIFLoader();
      cancelResourcesLoader("canceled");
    },
  };
}
export interface ImageLoaderResult {
  texture?: PIXI.Texture;
  animatedGIF?: AnimatedGIF;
}
