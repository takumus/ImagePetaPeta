import * as PIXI from "pixi.js";

import { Vec2 } from "@/commons/utils/vec2";

export class PSelection extends PIXI.Graphics {
  public topLeft = new Vec2();
  public bottomRight = new Vec2();
  public draw(scale: number) {
    const rect = this.getRect();
    this.rect(
      rect.leftTop.x,
      rect.leftTop.y,
      rect.rightBottom.x - rect.leftTop.x,
      rect.rightBottom.y - rect.leftTop.y,
    );
    this.stroke({
      width: 1 / scale,
      color: 0x000000,
    });
    this.fill({
      color: 0xffffff,
      alpha: 0.1,
    });
  }
  public getRect() {
    return {
      leftTop: new Vec2(
        Math.min(this.topLeft.x, this.bottomRight.x),
        Math.min(this.topLeft.y, this.bottomRight.y),
      ),
      rightTop: new Vec2(
        Math.max(this.topLeft.x, this.bottomRight.x),
        Math.min(this.topLeft.y, this.bottomRight.y),
      ),
      rightBottom: new Vec2(
        Math.max(this.topLeft.x, this.bottomRight.x),
        Math.max(this.topLeft.y, this.bottomRight.y),
      ),
      leftBottom: new Vec2(
        Math.min(this.topLeft.x, this.bottomRight.x),
        Math.max(this.topLeft.y, this.bottomRight.y),
      ),
    };
  }
}
