import { Vec2 } from "@/commons/utils/vec2";
import * as PIXI from "pixi.js";
const GRID_SIZE = 100;
const DIVISION = 5;
const SUB_GRID_SIZE = GRID_SIZE / DIVISION;
export class PBoardGrid extends PIXI.Container {
  grid: PIXI.Graphics;
  center: PIXI.Graphics;
  _scale = 1;
  constructor() {
    super();
    this.grid = new PIXI.Graphics();
    this.center = new PIXI.Graphics();
    this.addChild(this.grid, this.center);
  }
  update(width: number, height: number, position: Vec2, color: string) {
    const numColor = Number(color.replace("#", "0x")); // 後でutilsを作ろう
    this.grid.clear();
    this.center.clear();
    const getMaxVisibleGridSize = (size: number, division: number, min: number): number =>
      size < min * division
        ? size * division
        : getMaxVisibleGridSize(size / division, division, min);
    // DIVISIONのN乗で大きめの数字にした。
    const maxGridSize = getMaxVisibleGridSize(
      SUB_GRID_SIZE * Math.pow(DIVISION, 8) * this._scale,
      DIVISION,
      SUB_GRID_SIZE,
    );
    this.grid.position.set(
      (position.x % maxGridSize) + width / 2,
      (position.y % maxGridSize) + height / 2,
    );
    //------------------------------------------------------
    // 主線(maxGridSizeごと)
    //------------------------------------------------------
    this.grid.lineStyle(1, numColor, 1, undefined, true);
    this.renderGrid(maxGridSize, width, height);
    //------------------------------------------------------
    // 複線(maxGridSizeのDIVISONごと)
    //------------------------------------------------------
    this.grid.lineStyle(
      1,
      numColor,
      // 透明度はグリッドサイズとの距離 0.05が最小、最大が1
      Math.max(Math.min((maxGridSize - GRID_SIZE) / (GRID_SIZE * DIVISION - GRID_SIZE), 1), 0.05),
      undefined,
      true,
    );
    this.renderGrid(maxGridSize / DIVISION, width, height);
    // 中心線
    this.center.lineStyle(2, numColor);
    this.center.drawPolygon(position.x + width / 2, -height, position.x + width / 2, height);
    this.center.drawPolygon(-width, position.y + height / 2, width, position.y + height / 2);
    // デバッグ中心線
    this.grid.lineStyle(4, 0xff0000);
    this.grid.drawPolygon(0, -16, 0, 16);
    this.grid.drawPolygon(-16, 0, 16, 0);
  }
  setScale(scale: number) {
    this._scale = scale;
  }
  private renderGrid(size: number, width: number, height: number) {
    const cx = width / size;
    const cy = height / size;
    // 横軸
    for (let i = 0; i < cx; i++) {
      const x = size * i;
      this.grid.drawPolygon(x, -height, x, height);
      this.grid.drawPolygon(-x, -height, -x, height);
    }
    // 縦軸
    for (let i = 0; i < cy; i++) {
      const y = size * i;
      this.grid.drawPolygon(-width, y, width, y);
      this.grid.drawPolygon(-width, -y, width, -y);
    }
  }
}
