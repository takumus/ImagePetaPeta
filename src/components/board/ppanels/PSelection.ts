import * as PIXI from 'pixi.js';
import Logo from "@/assets/dashedLineTexture.png";
import { Vec2 } from '@/utils/vec2';
export class PSelection extends PIXI.Container {
  texture?: PIXI.TilingSprite;
  graphics: PIXI.Graphics = new PIXI.Graphics();
  corners: Vec2[] = [];
  renderScale = 1;
  constructor() {
    super();
    this.init();
  }
  async init() {
    this.texture = new PIXI.TilingSprite(await PIXI.Texture.fromURL(Logo), 100, 100);
    this.texture.mask = this.graphics;
    this.texture.anchor.set(0.5, 0.5);
    this.addChild(this.texture);
    this.addChild(this.graphics);
  }
  setCorners(corners: Vec2[]) {
    this.corners = corners;
  }
  setScale(scale: number) {
    this.renderScale = scale;
  }
  update() {
    if (!this.texture) return;
    if (this.corners.length < 4) return;
    this.texture.tilePosition.x += 0.2 * this.renderScale;
    this.texture.tileScale.set(0.5 * this.renderScale);
    this.graphics.clear();
    this.graphics.lineStyle(1 * this.renderScale, 0x00ff00);
    this.graphics.moveTo(this.corners[0].x, this.corners[0].y);
    for (let i = 1; i < this.corners.length + 1; i++) {
      const c = this.corners[i % this.corners.length];
      this.graphics.lineTo(c.x, c.y);
    }
    this.corners.reduce((p, c) => p.clone().add(c), new Vec2())
    .div(this.corners.length)
    .setTo(this.texture);
    const diff = new Vec2(this.corners[0]).getDiff(this.corners[1]);
    this.texture.width = diff.getLength() * 1.2;
    this.texture.height = new Vec2(this.corners[1]).getDistance(this.corners[2]) * 1.2;
    this.texture.rotation = diff.atan2();
  }
}