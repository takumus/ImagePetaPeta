import * as PIXI from "pixi.js";

import { Vec2 } from "@/commons/utils/vec2";

export class PSelection extends PIXI.Graphics {
  public topLeft = new Vec2();
  public bottomRight = new Vec2();
  public draw(scale: number) {
    this.lineStyle(1 / scale, 0x000000, 1, undefined, true);
    this.beginFill(0xffffff, 0.1);
    this.drawRect(
      this.rect.leftTop.x,
      this.rect.leftTop.y,
      this.rect.rightBottom.x - this.rect.leftTop.x,
      this.rect.rightBottom.y - this.rect.leftTop.y,
    );
  }
  public get rect() {
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
