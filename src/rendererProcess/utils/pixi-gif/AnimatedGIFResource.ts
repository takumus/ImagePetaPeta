import { ANIMATED_GIF_DECODE_THREAD } from "@/commons/defines";
import { AnimatedGIF } from "@/rendererProcess/utils/pixi-gif/AnimatedGIF";
import pLimit from "p-limit";

export class AnimatedGIFResource {
  private loaded = false;
  private _animatedGIF: AnimatedGIF | undefined;
  private static decodeLimit = pLimit(ANIMATED_GIF_DECODE_THREAD);
  private canceled = false;
  private cancelPromise: () => void = () => {
    //
  };
  private loadingPromise: Promise<AnimatedGIFResource> | undefined;
  constructor(public readonly buffer: ArrayBuffer) {
    //
  }
  public async load(): Promise<AnimatedGIFResource> {
    this.canceled = false;
    if (this.loaded) {
      return this;
    }
    if (this.loadingPromise !== undefined) {
      return this.loadingPromise;
    }
    this.loadingPromise = AnimatedGIFResource.decodeLimit(() => {
      if (this.canceled) {
        return this;
      }
      const result = AnimatedGIF.decodeFromBuffer(this.buffer);
      this.cancelPromise = result.cancel;
      return new Promise<AnimatedGIFResource>((res, rej) => {
        result.promise
          .then((animatedGIF) => {
            this._animatedGIF = animatedGIF;
            this.loaded = true;
            this.loadingPromise = undefined;
            res(this);
          })
          .catch((reason) => {
            this.loadingPromise = undefined;
            rej(reason);
          });
      });
    });
    return this.loadingPromise;
  }
  public getNewAnimatedGIF() {
    return this._animatedGIF?.clone();
  }
  public getAnimatedGIF() {
    return this._animatedGIF;
  }
  public readonly cancel = () => {
    if (this.loaded) {
      return;
    }
    this.loaded = false;
    this.loadingPromise = undefined;
    this.canceled = true;
    this.cancelPromise();
  };
}
