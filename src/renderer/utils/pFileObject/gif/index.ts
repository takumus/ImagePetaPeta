import { RPetaFile } from "@/commons/datas/rPetaFile";

import { AnimatedGIF } from "@/renderer/libs/pixi-gif/animatedGIF";
import { getImage } from "@/renderer/utils/pFileObject/@loaders/imageLoader";
import { PPlayableFileObjectContent } from "@/renderer/utils/pFileObject/pPlayableFileObjectContainer";

export class PGIFFileObjectContent extends PPlayableFileObjectContent<void> {
  animatedGIF?: AnimatedGIF;
  private _cancelLoading?: () => void;
  private _canceledLoading = false;
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
        this.event.emit("updateRenderer");
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
  getPaused() {
    return !this.animatedGIF?.playing;
  }
  getDuration() {
    return (this.animatedGIF?.totalFrames ?? 1) - 1;
  }
  getCurrentTime() {
    return this.animatedGIF?.currentFrame ?? 0;
  }
  getSeekable() {
    return this.animatedGIF !== undefined;
  }
  setCurrentTime(currentTime: number) {
    if (this.animatedGIF === undefined) {
      return;
    }
    this.animatedGIF.currentFrame = Math.floor(currentTime);
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
