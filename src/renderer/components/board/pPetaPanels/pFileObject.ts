import * as PIXI from "pixi.js";

import { RPetaFile } from "@/commons/datas/rPetaFile";

import { getImage } from "@/renderer/components/board/pPetaPanels/ImageLoader";
import {
  VideoLoaderResult,
  videoLoader,
} from "@/renderer/components/board/pPetaPanels/videoLoader";
import { AnimatedGIF } from "@/renderer/libs/pixi-gif/animatedGIF";

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

export abstract class PFileObjectContent extends PIXI.Sprite {
  abstract load(petaFile: RPetaFile): Promise<boolean>;
  public onUpdateRenderer = () => {
    //
  };
  abstract cancelLoading(): void;
  public setWidth(width: number) {
    this.width = width;
  }
  public setHeight(height: number) {
    this.height = height;
  }
  public getWidth() {
    return this.width;
  }
  public getHeight() {
    return this.height;
  }
}
export class PVideoFileObjectContent extends PFileObjectContent {
  private video?: VideoLoaderResult;
  private _canceledLoading = false;
  async load(petaFile: RPetaFile) {
    this.video = videoLoader(petaFile, false, () => {
      this.onUpdateRenderer();
    });
    const texture = await this.video.load();
    if (this._canceledLoading) {
      texture.destroy();
      return false;
    }
    this.texture = texture;
    return true;
  }
  destroy() {
    this.video?.destroy();
    super.destroy();
  }
  play() {
    return this.video?.play();
  }
  pause() {
    return this.video?.pause();
  }
  setVolume(volume: number) {
    if (this.video !== undefined) {
      this.video.videoElement.volume = volume;
    }
  }
  cancelLoading(): void {
    this._canceledLoading = true;
    return;
  }
}
export class PImageFileObjectContent extends PFileObjectContent {
  private _cancelLoading?: () => void;
  private _canceledLoading = false;
  async load(petaFile: RPetaFile) {
    const result = getImage(petaFile);
    this._cancelLoading = result.cancel;
    const image = await result.promise;
    if (this._canceledLoading) {
      return false;
    }
    if (image.texture) {
      this.texture = image.texture;
    }
    return true;
  }
  destroy() {
    super.destroy();
  }
  cancelLoading(): void {
    this._canceledLoading = true;
    this._cancelLoading?.();
    return;
  }
}
export class PGIFFileObjectContent extends PFileObjectContent {
  animatedGIF?: AnimatedGIF;
  private _cancelLoading?: () => void;
  private _canceledLoading = false;
  public onUpdateRenderer = () => {
    //
  };
  async load(petaFile: RPetaFile) {
    const result = getImage(petaFile);
    this._cancelLoading = result.cancel;
    const image = await result.promise;
    if (this._canceledLoading) {
      return false;
    }
    if (image.animatedGIF) {
      this.animatedGIF = image.animatedGIF;
      this.animatedGIF.onFrameChange = () => {
        this.onUpdateRenderer();
      };
      this.addChild(this.animatedGIF);
    }
    return true;
  }
  destroy() {
    super.destroy();
  }
  play() {
    return this.animatedGIF?.play();
  }
  pause() {
    return this.animatedGIF?.stop();
  }
  cancelLoading(): void {
    this._canceledLoading = true;
    this._cancelLoading?.();
  }
  public setWidth(width: number) {
    if (this.animatedGIF === undefined) {
      return;
    }
    this.animatedGIF.width = width;
  }
  public setHeight(height: number) {
    if (this.animatedGIF === undefined) {
      return;
    }
    this.animatedGIF.height = height;
  }
  public getWidth() {
    if (this.animatedGIF === undefined) {
      return 0;
    }
    return this.animatedGIF.width;
  }
  public getHeight() {
    if (this.animatedGIF === undefined) {
      return 0;
    }
    return this.animatedGIF.height;
  }
}
