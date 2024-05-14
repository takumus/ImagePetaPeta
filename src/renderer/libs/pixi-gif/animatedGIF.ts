/* eslint-disable */
// import { settings } from "pixi.js";
import {
  DEPRECATED_SCALE_MODES,
  Renderer,
  Sprite,
  Texture,
  Ticker,
  UPDATE_PRIORITY,
} from "pixi.js";

export interface AnimatedGIFFrame {
  imageData: ImageData;
  start: number;
  end: number;
}
export interface AnimatedGIFOptions {
  scaleMode: DEPRECATED_SCALE_MODES;
  loop: boolean;
  animationSpeed: number;
  autoUpdate: boolean;
  onComplete?: () => void;
  onLoop?: () => void;
  onFrameChange?: (currentFrame: number) => void;
  fps: number;
}
export class AnimatedGIF extends Sprite {
  public static defaultOptions: AnimatedGIFOptions = {
    scaleMode: DEPRECATED_SCALE_MODES.LINEAR,
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
  private _frames: AnimatedGIFFrame[];
  private _context?: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  public dirty = false;
  private _currentFrame = 0;
  private _autoUpdate = false;
  private _isConnectedToTicker: boolean;
  private _playing: boolean;
  private _currentTime: number;
  constructor(frames: AnimatedGIFFrame[], options?: Partial<AnimatedGIFOptions>) {
    super();
    const { scaleMode, ...rest } = Object.assign({}, AnimatedGIF.defaultOptions, options);
    const canvas = new OffscreenCanvas(0, 0);
    const context = canvas.getContext("2d");
    canvas.width = frames[0]!.imageData.width;
    canvas.height = frames[0]!.imageData.height;
    this.texture = Texture.from(canvas as any);
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
      // Ticker.shared.remove(this.update);
      this._isConnectedToTicker = false;
    }
  }
  public play(): void {
    if (this._playing) {
      return;
    }
    this._playing = true;
    if (this._autoUpdate && !this._isConnectedToTicker) {
      // Ticker.shared.add(this.update);
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
  update = (deltaTime: number) => {
    if (!this._playing) {
      return;
    }
    const elapsed = (this.animationSpeed * deltaTime) / 60;
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
  };
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
    // super._render(renderer);
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
        // Ticker.shared.remove(this.update, this);
        this._isConnectedToTicker = false;
      } else if (this._autoUpdate && !this._isConnectedToTicker && this._playing) {
        // Ticker.shared.add(this.update, this);
        this._isConnectedToTicker = true;
      }
    }
  }
  get currentFrame(): number {
    return this._currentFrame;
  }
  get currentTime(): number {
    return this._currentTime;
  }
  set currentFrame(value: number) {
    this.updateFrameIndex(value);
    this._currentTime = this._frames[value]!.start;
  }
  set currentTime(value: number) {
    this._currentTime = value;
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
      scaleMode: DEPRECATED_SCALE_MODES.LINEAR,
      animationSpeed: this.animationSpeed,
      onComplete: this.onComplete,
      onFrameChange: this.onFrameChange,
      onLoop: this.onLoop,
    });
  }
}
