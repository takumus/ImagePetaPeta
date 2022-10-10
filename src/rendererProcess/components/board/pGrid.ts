import * as PIXI from "pixi.js";
export class PBoardGrid extends PIXI.Container {
  crossLine: PIXI.Graphics;
  constructor() {
    super();
    this.crossLine = new PIXI.Graphics();
    this.addChild(this.crossLine);
  }
  update(width: number, height: number, color: string) {
    this.crossLine.clear();
    this.crossLine.lineStyle(1, Number(color.replace("#", "0x")), 1, undefined, true);
    this.crossLine.moveTo(-width, 0);
    this.crossLine.lineTo(width, 0);
    this.crossLine.moveTo(0, -height);
    this.crossLine.lineTo(0, height);
  }
}
