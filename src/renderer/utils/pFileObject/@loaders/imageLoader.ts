import * as PIXI from "pixi.js";

import { FileType } from "@/commons/datas/fileType";
import { RPetaFile } from "@/commons/datas/rPetaFile";

import { AnimatedGIF } from "@/renderer/libs/pixi-gif/animatedGIF";
import { AnimatedGIFResource } from "@/renderer/libs/pixi-gif/animatedGIFResource";
import { getFileURL } from "@/renderer/utils/fileURL";

export class ImageLoader {
  private canceled = false;
  private cancelAnimatedGIFLoader = () => {
    //
  };
  private cancelResourcesLoader = (reason: string) => {
    reason;
  };
  constructor(private petaFile: RPetaFile) {
    //
  }
  load() {
    return new Promise<ImageLoaderResult>((res, rej) => {
      if (this.canceled) {
        rej("canceled");
        return;
      }
      this.cancelResourcesLoader = rej;
      if (!this.petaFile) {
        rej("petaFile is undefined");
        return;
      }
      const fileURL = getFileURL(this.petaFile, "original");
      PIXI.Assets.load(fileURL)
        .then(async (resource) => {
          if (this.canceled) {
            rej("canceled");
            return;
          }
          if (resource instanceof AnimatedGIFResource) {
            console.log(resource);
            this.cancelAnimatedGIFLoader = resource.cancel;
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
          rej(`unknown resource: ${fileURL}`);
        })
        .catch((reason) => {
          rej(`could not load resource: ${reason}`);
        });
    });
  }
  cancel() {
    this.canceled = true;
    this.cancelAnimatedGIFLoader();
    this.cancelResourcesLoader("canceled");
  }
}
export interface ImageLoaderResult {
  texture?: PIXI.Texture;
  animatedGIF?: AnimatedGIF;
}
