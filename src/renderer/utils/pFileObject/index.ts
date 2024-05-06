import * as PIXI from "pixi.js";

import { RPetaFile } from "@/commons/datas/rPetaFile";

import { PGIFFileObjectContent } from "@/renderer/utils/pFileObject/gif";
import { PImageFileObjectContent } from "@/renderer/utils/pFileObject/image";
import { PFileObjectContent } from "@/renderer/utils/pFileObject/pFileObjectContent";
import { PVideoFileObjectContent } from "@/renderer/utils/pFileObject/video";

export class PFileObject extends PIXI.Sprite {
  public content?: PFileObjectContent<any>;
  private _loaded = false;
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
      if (petaFile.metadata.mimeType === "image/gif") {
        this.content = new PGIFFileObjectContent();
        await this.content.load(petaFile);
        this.addChild(this.content);
      } else {
        this.content = new PImageFileObjectContent();
        await this.content.load(petaFile);
        this.addChild(this.content);
      }
    }
    this._loaded = true;
  }
  get loaded() {
    return this._loaded;
  }
  destroy() {
    if (this.content !== undefined) {
      this.removeChild(this.content);
    }
    this.content?.destroy();
    super.destroy();
  }
}
