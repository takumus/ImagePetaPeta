import { Vec2 } from "@/commons/utils/vec2";
import * as PIXI from "pixi.js";
const GRID_SIZE = 100;
const DIVISION = 5;
export class PBoardGrid extends PIXI.Container {
  grid: PIXI.Graphics;
  _scale = 1;
  _debug = false;
  constructor() {
    super();
    this.grid = new PIXI.Graphics();
    this.addChild(this.grid);
  }
  update(width: number, height: number, position: Vec2, color: string) {
    const numColor = Number(color.replace("#", "0x")); // 後でutilsを作ろう
    this.grid.clear();
    const getMaxVisibleGridSize = (size: number, division: number, min: number): number =>
      size < min * division
        ? size * division
        : getMaxVisibleGridSize(size / division, division, min);
    const render = (
      position: number,
      size: number,
      division: number,
      min: number,
      sign: number,
      direction: "x" | "y",
    ) => {
      if (
        size < min ||
        (direction === "x" && (position > width * 2 || position < -width)) ||
        (direction === "y" && (position > height * 2 || position < -height))
      ) {
        return false;
      }
      const alpha = Math.min((size - min) / (min * division - min) + 0.05, 1);
      this.grid.lineStyle(1, numColor, alpha, undefined, true);
      if (this._debug) {
        if (alpha < 1) {
          this.grid.lineStyle(1, 0x00ff00, 0.3);
        } else {
          this.grid.lineStyle(1, 0xff0000, 1);
        }
      }
      if (direction === "x") {
        this.grid.moveTo(position, -height);
        this.grid.lineTo(position, height);
      } else {
        this.grid.moveTo(-width, position);
        this.grid.lineTo(width, position);
      }
      for (let i = 0; i < division; i++) {
        if (
          !render(
            position + (size / division) * i * sign,
            size / division,
            division,
            min,
            sign,
            direction,
          )
        ) {
          break;
        }
      }
      return true;
    };
    const min = GRID_SIZE / DIVISION;
    const baseSize = min * Math.pow(DIVISION, 5) * this._scale; // DIVISIONのN乗で大きめの数字にした。
    const maxGridSize = getMaxVisibleGridSize(baseSize, DIVISION, min);
    render(0, baseSize, DIVISION, min, 1, "x"); // 右
    render(0, baseSize, DIVISION, min, -1, "x"); // 左
    render(0, baseSize, DIVISION, min, 1, "y"); // 下
    render(0, baseSize, DIVISION, min, -1, "y"); // 上
    if (this._debug) {
      this.grid.lineStyle(3, 0xffff00, 1);
      this.grid.moveTo(0, -32);
      this.grid.lineTo(0, 32);
      this.grid.moveTo(-32, 0);
      this.grid.lineTo(32, 0);
    }
    this.grid.position.set(
      (position.x % maxGridSize) + width / 2,
      (position.y % maxGridSize) + height / 2,
    );
  }
  setScale(scale: number) {
    this._scale = scale;
  }
  set DEBUG(value: boolean) {
    this._debug = value;
  }
  get DEBUG() {
    return this._debug;
  }
}
