import * as PIXI from "pixi.js";

import { Vec2 } from "@/commons/utils/vec2";

import { useCommonTextureStore } from "@/renderer/stores/commonTextureStore/useCommonTextureStore";

export class PTransformerDashedLine extends PIXI.Container {
  texture?: PIXI.TilingSprite;
  graphics: PIXI.Graphics = new PIXI.Graphics();
  corners: [Vec2, Vec2, Vec2, Vec2, Vec2, Vec2, Vec2, Vec2];
  dirty = false;
  renderScale = 1;
  constructor() {
    super();
    this.corners = Array.from({ length: 8 }, () => new Vec2()) as typeof this.corners;
    this.init();
  }
  init() {
    this.texture = new PIXI.TilingSprite({
      texture: useCommonTextureStore().DASHED_LINE,
      width: 100,
      height: 100,
    });
    this.texture.mask = this.graphics;
    this.texture.anchor.set(0.5, 0.5);
    this.addChild(this.texture);
    this.addChild(this.graphics);
  }
  setCorners(corners: Vec2[]) {
    if (this.corners.join(",") !== corners.join(",")) {
      this.dirty = true;
    }
    this.corners = corners as typeof this.corners;
  }
  setScale(scale: number) {
    if (this.renderScale !== scale) {
      this.dirty = true;
    }
    this.renderScale = scale;
  }
  update() {
    if (!this.texture) return;
    this.texture.tilePosition.x += 2 * this.renderScale * PIXI.Ticker.shared.maxFPS;
    this.texture.tileScale.set(0.5 * this.renderScale);
    if (!this.dirty) return;
    if (this.corners.length < 5) return;
    this.graphics.clear();
    this.graphics.poly(this.corners.map((p) => new PIXI.Point(p.x, p.y)));
    this.graphics.stroke({
      width: this.renderScale,
      color: 0x00ff00,
    });
    this.corners
      .reduce((p, c) => p.clone().add(c), new Vec2())
      .div(this.corners.length)
      .setTo(this.texture);
    const diff = new Vec2(this.corners[0]).getDiff(this.corners[2]);
    this.texture.width = diff.getLength() * 1.2;
    this.texture.height = new Vec2(this.corners[2]).getDistance(this.corners[4]) * 1.2;
    this.texture.rotation = diff.atan2();
    this.dirty = false;
  }
}
