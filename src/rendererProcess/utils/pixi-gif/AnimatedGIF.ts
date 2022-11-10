/* eslint-disable */
import { Sprite } from "@pixi/sprite";
import { Texture, Renderer } from "@pixi/core";
import { settings } from "@pixi/settings";
import { SCALE_MODES } from "@pixi/constants";
import { Ticker, UPDATE_PRIORITY } from "@pixi/ticker";
import DecompressWorker from "@/rendererProcess/utils/pixi-gif/decompress.worker";
import {
  DecompressWorkerInputData,
  DecompressWorkerOutputData,
} from "@/rendererProcess/utils/pixi-gif/decompressWorkerData";
interface FrameObject {
  imageData: ImageData;
  start: number;
  end: number;
}
interface AnimatedGIFOptions {
  scaleMode: SCALE_MODES;
  loop: boolean;
  animationSpeed: number;
  autoUpdate: boolean;
  onComplete?: () => void;
  onLoop?: () => void;
  onFrameChange?: (currentFrame: number) => void;
  fps: number;
}
class AnimatedGIF extends Sprite {
  public static defaultOptions: AnimatedGIFOptions = {
    scaleMode: SCALE_MODES.LINEAR,
    fps: Ticker.shared.FPS,
    loop: true,
    animationSpeed: 1,
    autoUpdate: true,
    onComplete: undefined,
    onFrameChange: undefined,
    onLoop: undefined,
  };
  public animationSpeed = 1;
  public loop = true;
  public onComplete?: () => void;
  public onFrameChange?: (currentFrame: number) => void;
  public onLoop?: () => void;
  public readonly duration: number;
  private _frames: FrameObject[];
  private _context?: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  public dirty = false;
  private _currentFrame = 0;
  private _autoUpdate = false;
  private _isConnectedToTicker: boolean;
  private _playing: boolean;
  private _currentTime: number;
  static decodeFromBuffer(buffer: ArrayBuffer, options?: Partial<AnimatedGIFOptions>) {
    if (!buffer || buffer.byteLength === 0) {
      throw new Error("Invalid buffer");
    }
    const frames: FrameObject[] = [];
    let time = 0;
    const { fps } = Object.assign({}, AnimatedGIF.defaultOptions, options);
    console.log("GIF(worker): begin converting");
    const defaultDelay = 1000 / fps;
    let cancel = () => {
      //
    };
    const worker = new (DecompressWorker as any)() as Worker;
    const promise = new Promise<AnimatedGIF>((res, rej) => {
      cancel = rej;
      worker.postMessage({
        buffer,
        defaultDelay,
      } as DecompressWorkerInputData);
      worker.addEventListener("error", (e) => {
        worker.terminate();
        rej(e.message);
      });
      worker.addEventListener("message", (e) => {
        const data = e.data as DecompressWorkerOutputData;
        console.log(`GIF(worker): converting (${data.index + 1}/${data.length})`);
        const endTime = time + data.delay;
        frames.push({
          start: time,
          end: endTime,
          imageData: data.imageData,
        });
        time = endTime;
        if (data.isLast) {
          worker.terminate();
          console.log("GIF(worker): complete converting");
          res(new AnimatedGIF(frames, options));
        }
      });
    });
    return {
      promise,
      cancel: () => {
        console.log("GIF(worker): cancel converting");
        worker.terminate();
        cancel();
      },
    };
  }
  constructor(frames: FrameObject[], options?: Partial<AnimatedGIFOptions>) {
    super();
    const { scaleMode, ...rest } = Object.assign({}, AnimatedGIF.defaultOptions, options);
    const canvas = new OffscreenCanvas(0, 0);
    const context = canvas.getContext("2d");
    canvas.width = frames[0]!.imageData.width;
    canvas.height = frames[0]!.imageData.height;
    this.texture = Texture.from(canvas as any, { scaleMode });
    this.duration = frames[frames.length - 1]!.end;
    this._frames = frames;
    this._context = context!;
    this._playing = false;
    this._currentTime = 0;
    this._isConnectedToTicker = false;
    Object.assign(this, rest);
    this.currentFrame = 0;
    this.updateFrame(true);
  }
  public stop(): void {
    if (!this._playing) {
      return;
    }
    this._playing = false;
    if (this._autoUpdate && this._isConnectedToTicker) {
      Ticker.shared.remove(this.update, this);
      this._isConnectedToTicker = false;
    }
  }
  public play(): void {
    if (this._playing) {
      return;
    }
    this._playing = true;
    if (this._autoUpdate && !this._isConnectedToTicker) {
      Ticker.shared.add(this.update, this, UPDATE_PRIORITY.HIGH);
      this._isConnectedToTicker = true;
    }
    if (!this.loop && this.currentFrame === this._frames.length - 1) {
      this._currentTime = 0;
    }
  }
  public get progress(): number {
    return this._currentTime / this.duration;
  }
  public get playing(): boolean {
    return this._playing;
  }
  update(deltaTime: number): void {
    if (!this._playing) {
      return;
    }
    const elapsed = (this.animationSpeed * deltaTime) / settings.TARGET_FPMS!;
    const currentTime = this._currentTime + elapsed;
    const localTime = currentTime % this.duration;
    const localFrame = this._frames.findIndex(
      (frame) => frame.start <= localTime && frame.end > localTime,
    );
    if (currentTime >= this.duration) {
      if (this.loop) {
        this._currentTime = localTime;
        this.updateFrameIndex(localFrame);
        this.onLoop?.();
      } else {
        this._currentTime = this.duration;
        this.updateFrameIndex(this._frames.length - 1);
        this.onComplete?.();
        this.stop();
      }
    } else {
      this._currentTime = localTime;
      this.updateFrameIndex(localFrame);
    }
  }
  private updateFrame(force = false): void {
    if (!this.dirty && !force) {
      return;
    }
    const { imageData } = this._frames[this._currentFrame]!;
    if (this._context) {
      this._context.putImageData(imageData, 0, 0);
      this._context.fillStyle = "transparent";
      this._context.fillRect(0, 0, 0, 1);
    }
    this.texture.update();
    this.dirty = false;
  }
  _render(renderer: Renderer): void {
    this.updateFrame();
    super._render(renderer);
  }
  _renderCanvas(renderer: any): void {
    this.updateFrame();
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    super._renderCanvas(renderer);
  }
  get autoUpdate(): boolean {
    return this._autoUpdate;
  }
  set autoUpdate(value: boolean) {
    if (value !== this._autoUpdate) {
      this._autoUpdate = value;
      if (!this._autoUpdate && this._isConnectedToTicker) {
        Ticker.shared.remove(this.update, this);
        this._isConnectedToTicker = false;
      } else if (this._autoUpdate && !this._isConnectedToTicker && this._playing) {
        Ticker.shared.add(this.update, this);
        this._isConnectedToTicker = true;
      }
    }
  }
  get currentFrame(): number {
    return this._currentFrame;
  }
  set currentFrame(value: number) {
    this.updateFrameIndex(value);
    this._currentTime = this._frames[value]!.start;
  }
  private updateFrameIndex(value: number): void {
    if (value < 0 || value >= this._frames.length) {
      throw new Error(`Frame index out of range, expecting 0 to ${this.totalFrames}, got ${value}`);
    }
    if (this._currentFrame !== value) {
      this._currentFrame = value;
      this.dirty = true;
      this.onFrameChange?.(value);
    }
  }
  get totalFrames(): number {
    return this._frames.length;
  }
  destroy(): void {
    this.stop();
    super.destroy(true);
    this._context = undefined;
    this._frames = [];
    this.onComplete = undefined;
    this.onFrameChange = undefined;
    this.onLoop = undefined;
  }
  clone(): AnimatedGIF {
    return new AnimatedGIF([...this._frames], {
      autoUpdate: this._autoUpdate,
      loop: this.loop,
      scaleMode: this.texture.baseTexture.scaleMode,
      animationSpeed: this.animationSpeed,
      onComplete: this.onComplete,
      onFrameChange: this.onFrameChange,
      onLoop: this.onLoop,
    });
  }
}
class AnimatedGIFResource {
  private loaded = false;
  private _animatedGIF: AnimatedGIF | undefined;
  private cancelPromise: () => void = () => {
    //
  };
  private loadingPromise: Promise<AnimatedGIFResource> | undefined;
  constructor(public readonly buffer: ArrayBuffer) {
    //
  }
  public async load(): Promise<AnimatedGIFResource> {
    if (this.loaded) {
      return this;
    }
    if (this.loadingPromise !== undefined) {
      return this.loadingPromise;
    }
    const result = AnimatedGIF.decodeFromBuffer(this.buffer);
    this.cancelPromise = result.cancel;
    this.loadingPromise = new Promise<AnimatedGIFResource>((res, rej) => {
      result.promise
        .then((animatedGIF) => {
          this._animatedGIF = animatedGIF;
          animatedGIF.stop();
          this.loaded = true;
          this.loadingPromise = undefined;
          res(this);
        })
        .catch((reason) => {
          this.loadingPromise = undefined;
          rej(reason);
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
    this.cancelPromise();
  };
}
export { AnimatedGIF, AnimatedGIFResource };
export type { AnimatedGIFOptions };
