import * as PIXI from "pixi.js";

import { RPetaFile } from "@/commons/datas/rPetaFile";

import { PGIFFileObjectContent } from "@/renderer/utils/pFileObject/gif";
import { PImageFileObjectContent } from "@/renderer/utils/pFileObject/image";
import { PFileObjectContent } from "@/renderer/utils/pFileObject/pFileObjectContent";
import { PVideoFileObjectContent } from "@/renderer/utils/pFileObject/video";

export class PFileObject extends PIXI.Sprite {
  public content?: PFileObjectContent;
  constructor() {
    super();
  }
  async load(petaFile: RPetaFile) {
    this.content?.destroy();
    if (petaFile?.metadata.type === "video") {
      this.content = new PVideoFileObjectContent();
      await this.content.load(petaFile);
      this.addChild(this.content);
    } else if (petaFile?.metadata.type === "image") {
      if (petaFile.mimeType === "image/gif") {
        this.content = new PGIFFileObjectContent();
        await this.content.load(petaFile);
        this.addChild(this.content);
      } else {
        this.content = new PImageFileObjectContent();
        await this.content.load(petaFile);
        this.addChild(this.content);
      }
    }
  }
  destroy() {
    this.content?.destroy();
    super.destroy();
  }
  cancelLoading() {
    this.content?.cancelLoading();
  }
}
