import { RPetaFile } from "@/commons/datas/rPetaFile";

import { AnimatedGIF } from "@/renderer/libs/pixi-gif/animatedGIF";
import { getImage } from "@/renderer/utils/pFileObject/@loaders/imageLoader";
import { PFileObjectContent } from "@/renderer/utils/pFileObject/pFileObjectContent";

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
    this._canceledLoading = true;
    this._cancelLoading?.();
    super.destroy();
  }
  play() {
    return this.animatedGIF?.play();
  }
  pause() {
    return this.animatedGIF?.stop();
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
