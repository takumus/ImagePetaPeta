import * as PIXI from "pixi.js";

export class PBackground extends PIXI.Graphics {
  renderRect(width: number, height: number, color: number) {
    this.clear();
    this.hitArea = new PIXI.Rectangle(0, 0, width, height);
    this.beginFill(color);
    this.drawRect(0, 0, width, height);
  }
}
