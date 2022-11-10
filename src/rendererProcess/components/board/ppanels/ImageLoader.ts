import { ImageType } from "@/commons/datas/imageType";
import { PetaImage } from "@/commons/datas/petaImage";
import { getImageURL } from "@/rendererProcess/utils/imageURL";
import { AnimatedGIF, AnimatedGIFResource } from "@/rendererProcess/utils/pixi-gif/AnimatedGIF";
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
      .then((resource) => {
        if (canceled) {
          rej("canceled");
          return;
        }
        if (resource instanceof AnimatedGIFResource) {
          resource
            .load()
            .then(() => {
              res({ animatedGIF: resource.getNewAnimatedGIF() });
            })
            .catch((reason) => {
              rej("could not load texture" + reason);
            });
          cancelAnimatedGIFLoader = resource.cancel;
          return;
        }
        if (resource instanceof PIXI.Texture) {
          res({ texture: resource });
          return;
        }
        rej("could not load texture");
      })
      .catch((reason) => {
        rej("could not load texture" + reason);
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
