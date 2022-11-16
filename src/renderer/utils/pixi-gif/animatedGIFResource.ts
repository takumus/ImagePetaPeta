import { ANIMATED_GIF_DECODE_THREAD } from "@/commons/defines";
import { AnimatedGIF } from "@/renderer/utils/pixi-gif/animatedGIF";
import { decodeFromBuffer } from "@/renderer/utils/pixi-gif/decoder/animatedGIFDecoder";
import pLimit from "p-limit";

export class AnimatedGIFResource {
  private deocded = false;
  private _animatedGIF: AnimatedGIF | undefined;
  private static decodeLimit = pLimit(ANIMATED_GIF_DECODE_THREAD);
  private canceled = false;
  private cancelPromise: () => void = () => {
    //
  };
  private decodePromise: Promise<AnimatedGIFResource> | undefined;
  constructor(public readonly buffer: ArrayBuffer) {
    //
  }
  public async load(): Promise<AnimatedGIFResource> {
    this.canceled = false;
    if (this.deocded) {
      return this;
    }
    if (this.decodePromise !== undefined) {
      return this.decodePromise;
    }
    this.decodePromise = AnimatedGIFResource.decodeLimit(() => {
      if (this.canceled) {
        return this;
      }
      const result = decodeFromBuffer(this.buffer);
      this.cancelPromise = result.cancel;
      return new Promise<AnimatedGIFResource>((res, rej) => {
        result.promise
          .then((animatedGIF) => {
            this._animatedGIF = animatedGIF;
            this.deocded = true;
            this.decodePromise = undefined;
            res(this);
          })
          .catch((reason) => {
            this.decodePromise = undefined;
            rej(reason);
          });
      });
    });
    return this.decodePromise;
  }
  public getNewAnimatedGIF() {
    return this._animatedGIF?.clone();
  }
  public getAnimatedGIF() {
    return this._animatedGIF;
  }
  public readonly cancel = () => {
    if (this.deocded) {
      return;
    }
    this.deocded = false;
    this.decodePromise = undefined;
    this.canceled = true;
    this.cancelPromise();
  };
}
