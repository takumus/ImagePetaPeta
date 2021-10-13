import * as PIXI from "pixi.js";
import Logo from "@/assets/dashedLineTexture.png";
import { Vec2 } from '@/utils/vec2';
export class PControlPoint extends PIXI.Container {
  size = new PIXI.Graphics();
  rotate = new PIXI.Graphics();
  constructor() {
    super();
    this.size.interactive = true;
    this.rotate.interactive = true;
    this.size.name = "transformer";
    this.rotate.name = "transformer";
    this.addChild(this.rotate, this.size);
    this.setScale(1);
    this.size.cursor = "pointer";
    this.rotate.cursor = "pointer";
  }
  setScale(scale: number) {
    this.size.clear();
    this.size.lineStyle(1 * scale, 0x000000);
    this.size.beginFill(0xffffff);
    this.size.drawRect(0, 0, 10 * scale, 10 * scale);
    this.size.pivot.x = 10 * scale / 2;
    this.size.pivot.y = 10 * scale / 2;

    this.rotate.clear();
    this.rotate.beginFill(0x00ff00);
    this.rotate.drawRect(0, 0, 40 * scale, 40 * scale);
    this.rotate.pivot.x = 40 * scale / 2;
    this.rotate.pivot.y = 40 * scale / 2;
  }
}