import * as PIXI from "pixi.js";
import * as Cursor from "@/rendererProcess/utils/cursor";
export class PControlPoint extends PIXI.Container {
  size = new PIXI.Graphics();
  rotate = new PIXI.Graphics();
  public currentRotation = 0;
  constructor() {
    super();
    this.size.interactive = true;
    this.rotate.interactive = true;
    this.size.name = "transformer";
    this.rotate.name = "transformer";
    this.addChild(this.rotate, this.size);
    this.setScale(1);
    this.size.cursor = "pointer";
    this.initCursor();
  }
  initCursor() {
    let mouseover = false;
    let dragging = false;
    this.rotate.on("mouseover", () => {
      mouseover = true;
      Cursor.setCursor(Cursor.ROTATE_CURSOR);
    });
    this.rotate.on("mouseout", () => {
      mouseover = false;
      if (!dragging) {
        Cursor.setDefaultCursor();
      }
    });
    this.rotate.on("mousedown", () => {
      dragging = true;
    });
    window.addEventListener("mouseup", () => {
      if (!dragging) {
        return;
      }
      dragging = false;
      if (!mouseover) {
        Cursor.setDefaultCursor();
      }
    });
  }
  setScale(scale: number) {
    this.size.clear();
    this.size.lineStyle(1 * scale, 0x000000, 1, undefined, true);
    this.size.beginFill(0xffffff);
    this.size.drawRect(0, 0, 10 * scale, 10 * scale);
    this.size.pivot.x = 10 * scale / 2;
    this.size.pivot.y = 10 * scale / 2;

    const hitArea = 16;
    this.rotate.hitArea = new PIXI.Circle(0, 0, hitArea * scale);
    // this.rotate.clear();
    // this.rotate.beginFill(0x00ff00);
    // this.rotate.drawCircle(0, 0, hitArea * scale);
    const r = this.currentRotation + Math.PI;
    const radius = 30 * scale / 2;

    this.rotate.pivot.x = Math.cos(r) * radius;
    this.rotate.pivot.y = Math.sin(r) * radius;
  }
}