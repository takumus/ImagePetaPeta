import * as PIXI from "pixi.js";

import { RPetaFile } from "@/commons/datas/rPetaFile";

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
