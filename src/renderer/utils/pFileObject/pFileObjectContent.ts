import * as PIXI from "pixi.js";
import { EventMap } from "typed-emitter";

import { RPetaFile } from "@/commons/datas/rPetaFile";
import { TypedEventEmitter } from "@/commons/utils/typedEventEmitter";

export abstract class PFileObjectContent<T extends EventMap | unknown> extends PIXI.Sprite {
  public event: TypedEventEmitter<
    T & {
      updateRenderer: () => void;
    }
  > = new TypedEventEmitter();
  abstract load(petaFile: RPetaFile): Promise<boolean>;
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
  public destroy(): void {
    this.event.removeAllListeners();
    super.destroy();
  }
}
