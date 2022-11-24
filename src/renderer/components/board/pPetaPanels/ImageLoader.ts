import * as PIXI from "pixi.js";

import { FileType } from "@/commons/datas/imageType";
import { RPetaFile } from "@/commons/datas/rPetaFile";

import { AnimatedGIF } from "@/renderer/libs/pixi-gif/animatedGIF";
import { AnimatedGIFResource } from "@/renderer/libs/pixi-gif/animatedGIFResource";
import { getImageURL } from "@/renderer/utils/imageURL";

export function getImage(petaFile: RPetaFile | undefined) {
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
    if (!petaFile) {
      rej("petaFile is undefined");
      return;
    }
    const imageURL = getImageURL(petaFile, FileType.ORIGINAL);
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
