import * as PIXI from "pixi.js";
import * as Cursor from "@/rendererProcess/utils/cursor";
export class PTransformerControlPoint extends PIXI.Container {
  public size = new PIXI.Graphics();
  public rotate = new PIXI.Graphics();
  public currentRotation = 0;
  public currentParentRotation = 0;
  public xPosition: -1 | 0 | 1 = 0;
  public yPosition: -1 | 0 | 1 = 0;
  resizeCursors = [
    "ns-resize",
    "nesw-resize",
    "ew-resize",
    "nwse-resize",
    "ns-resize",
    "nesw-resize",
    "ew-resize",
    "nwse-resize",
  ];
  constructor(public index: number) {
    super();
    this.size.interactive = true;
    this.rotate.interactive = true;
    this.size.name = "transformer";
    this.rotate.name = "transformer";
    this.addChild(this.rotate, this.size);
    this.setScale(1);
    this.initCursor();
  }
  initCursor() {
    let mouseover = false;
    let rotating = false;
    let sizing = false;
    this.rotate.on("mouseover", () => {
      if (sizing) {
        return;
      }
      mouseover = true;
      Cursor.setCursor(Cursor.cursors.ROTATE_CURSOR);
    });
    this.rotate.on("mouseout", () => {
      if (sizing) {
        return;
      }
      mouseover = false;
      if (!rotating) {
        Cursor.setDefaultCursor();
      }
    });
    this.rotate.on("pointerdown", () => {
      rotating = true;
    });
    this.size.on("mouseover", () => {
      if (rotating) {
        return;
      }
      mouseover = true;
      Cursor.setCursor(this.getResizeCursor(this.index));
    });
    this.size.on("mouseout", () => {
      if (rotating) {
        return;
      }
      mouseover = false;
      if (!sizing) {
        Cursor.setDefaultCursor();
      }
    });
    this.size.on("pointerdown", () => {
      sizing = true;
    });
    window.addEventListener("pointerup", () => {
      if (!sizing && !rotating) {
        return;
      }
      rotating = false;
      sizing = false;
      if (!mouseover) {
        Cursor.setDefaultCursor();
      }
    });
  }
  getResizeCursor(index: number) {
    const rot = Math.floor((this.currentParentRotation / Math.PI) * 180 + 45 / 2) % 360;
    const offset = Math.floor((rot + (rot < 0 ? 360 : 0)) / 45) + 8;
    return this.resizeCursors[(offset + index - 1) % 8];
  }
  setScale(scale: number) {
    this.size.clear();
    this.size.lineStyle(1 * scale, 0x000000, 1, undefined, true);
    this.size.beginFill(0xffffff);
    this.size.drawRect(0, 0, 10 * scale, 10 * scale);
    this.size.pivot.x = (10 * scale) / 2;
    this.size.pivot.y = (10 * scale) / 2;

    const hitArea = 16;
    this.rotate.hitArea = new PIXI.Circle(0, 0, hitArea * scale);
    // this.rotate.clear();
    // this.rotate.beginFill(0x00ff00);
    // this.rotate.drawCircle(0, 0, hitArea * scale);
    const r = this.currentRotation + Math.PI;
    const radius = (30 * scale) / 2;

    this.rotate.pivot.x = Math.cos(r) * radius;
    this.rotate.pivot.y = Math.sin(r) * radius;
  }
}
