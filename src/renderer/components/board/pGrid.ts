import * as PIXI from "pixi.js";

import { BOARD_ZOOM_MAX } from "@/commons/defines";
import { valueChecker } from "@/commons/utils/valueChecker";
import { Vec2 } from "@/commons/utils/vec2";

const GRID_SIZE = 100;
const DIVISION = 5;
const SUB_GRID_SIZE = GRID_SIZE / DIVISION;
const MAX_ALPHA = 0.2;
const MIN_ALPHA = 0.04;
const MAXIMUM_ZOOM_BEGIN__scale = 50;
export class PBoardGrid extends PIXI.Container {
  grid: PIXI.Graphics;
  center: PIXI.Graphics;
  __scale = 1;
  private ignoreRenderGrids = valueChecker();
  private ignoreRenderCenter = valueChecker();
  constructor() {
    super();
    this.grid = new PIXI.Graphics();
    this.center = new PIXI.Graphics();
    this.addChild(this.grid, this.center);
  }
  update(width: number, height: number, position: Vec2, color: string) {
    const numColor = Number(color.replace("#", "0x")); // 後でutilsを作ろう
    const getMaxVisibleGridSize = (size: number, division: number, min: number): number =>
      size < min * division
        ? size * division
        : getMaxVisibleGridSize(size / division, division, min);
    // DIVISIONのN乗で大きめの数字にした。
    const maxGridSize = getMaxVisibleGridSize(
      SUB_GRID_SIZE * Math.pow(DIVISION, 8) * this.__scale,
      DIVISION,
      SUB_GRID_SIZE,
    );
    if (!this.ignoreRenderGrids(width, height, numColor, this.__scale)) {
      this.grid.clear();
      const maximumZoomAlpha = Math.max(
        (this.__scale - (BOARD_ZOOM_MAX - MAXIMUM_ZOOM_BEGIN__scale)) / MAXIMUM_ZOOM_BEGIN__scale,
        0,
      );
      //------------------------------------------------------
      // 主線(maxGridSizeごと)
      //------------------------------------------------------
      this.renderGrid(maxGridSize, width, height);
      this.grid.stroke({
        width: 1,
        color: numColor,
        alpha: MAX_ALPHA * (1 - maximumZoomAlpha),
      });
      //------------------------------------------------------
      // 複線(maxGridSizeのDIVISONごと)
      //------------------------------------------------------
      this.renderGrid(maxGridSize / DIVISION, width, height, DIVISION);
      this.grid.stroke({
        width: 1,
        color: numColor,
        // 透明度はグリッドサイズとの距離 0.05が最小、最大が1
        alpha:
          Math.max(
            Math.min((maxGridSize - GRID_SIZE) / (GRID_SIZE * DIVISION - GRID_SIZE), MAX_ALPHA),
            MIN_ALPHA,
          ) *
          (1 - maximumZoomAlpha),
      });
      //------------------------------------------------------
      // 最大ズーム時の線 (複線のDIVISION倍の細かさ)
      //------------------------------------------------------
      if (maximumZoomAlpha > 0) {
        this.renderGrid(maxGridSize / (DIVISION * DIVISION), width, height);
        this.grid.stroke({
          width: 1,
          color: numColor,
          // 透明度はグリッドサイズとの距離 0.05が最小、最大が1
          alpha: maximumZoomAlpha * MAX_ALPHA,
        });
      }
    }
    if (!this.ignoreRenderCenter(width, height, this.__scale, numColor, position.x, position.y)) {
      this.center.clear();
      //------------------------------------------------------
      // 中心線
      //------------------------------------------------------
      this.center.drawPolygon([position.x + width / 2, -height, position.x + width / 2, height]);
      this.center.drawPolygon([-width, position.y + height / 2, width, position.y + height / 2]);
      this.center.stroke({
        width: 1,
        color: numColor,
      });
    }
    //------------------------------------------------------
    // 基準座標
    //------------------------------------------------------
    this.grid.position.set(
      (position.x % maxGridSize) + width / 2,
      (position.y % maxGridSize) + height / 2,
    );
    // デバッグ中心線
    // this.grid.lineStyle(4, 0xff0000);
    // this.grid.drawPolygon(0, -16, 0, 16);
    // this.grid.drawPolygon(-16, 0, 16, 0);
  }
  setScale(scale: number) {
    this.__scale = scale;
  }
  private renderGrid(size: number, width: number, height: number, skipIndex?: number) {
    width += GRID_SIZE * DIVISION;
    height += GRID_SIZE * DIVISION;
    const cx = width / size;
    const cy = height / size;
    const useSkipIndex = skipIndex !== undefined;
    // 横軸
    for (let i = 0; i < cx; i++) {
      if (useSkipIndex && i % skipIndex === 0) continue;
      const x = size * i;
      this.grid.drawPolygon([x, -height, x, height]);
      if (i > 0) this.grid.drawPolygon([-x, -height, -x, height]);
    }
    // 縦軸
    for (let i = 0; i < cy; i++) {
      if (useSkipIndex && i % skipIndex === 0) continue;
      const y = size * i;
      this.grid.drawPolygon([-width, y, width, y]);
      if (i > 0) this.grid.drawPolygon([-width, -y, width, -y]);
    }
  }
}
