import { ImageType } from '@/datas/imageType';
import { PetaImage } from '@/datas/petaImage';
import { PetaPanel } from '@/datas/petaPanel';
import { ImageLoader } from '@/imageLoader';
import { Vec2 } from '@/utils/vec2';
import * as PIXI from 'pixi.js';
export class PPanel extends PIXI.Sprite {
  public selected = false;
  public dragging = false;
  public draggingOffset = new Vec2();
  public image = new PIXI.Sprite();
  public selectedOutline = new PIXI.Graphics();
  private loader = new PIXI.Loader();
  constructor(public petaPanel: PetaPanel) {
    super();
    this.anchor.set(0.5, 0.5);
    this.image.anchor.set(0.5, 0.5);
    this.addChild(this.image);
    this.addChild(this.selectedOutline);
    this.interactive = true;
    this.update();
  }
  public loadTexture(type: ImageType): Promise<void> {
    const url = this.petaPanel._petaImage ? ImageLoader.getImageURL(this.petaPanel._petaImage, type): "";
    return new Promise((res, rej) => {
      if (!this.petaPanel._petaImage) {
        rej();
        return;
      }
      const texture = PIXI.utils.TextureCache[url];
      if (texture) {
        this.image.texture = texture;
        this.update();
        res();
        return;
      }
      this.loader.add(url);
      this.loader.load((loader, resources) => {
        if (!this.petaPanel._petaImage) {
          rej();
          return;
        }
        this.image.texture = resources[ImageLoader.getImageURL(this.petaPanel._petaImage, type)].texture!;
        this.update();
        res();
      });
    });
  }
  public update() {
    this.image.width = this.petaPanel.width;
    this.image.height = this.petaPanel.height;
    this.x = this.petaPanel.position.x;
    this.y = this.petaPanel.position.y;
    this.rotation = this.petaPanel.rotation;
    this.selectedOutline.clear();
    if (this.selected) {
      this.selectedOutline.lineStyle({ width: 1, color: 0xff0000 });
      this.selectedOutline.drawRect(-this.image.width/2, -this.image.height/2, this.image.width, this.image.height);
    }
  }
  public getCorners(): Vec2[] {
    return [
      new Vec2(-this.petaPanel.width / 2, -this.petaPanel.height / 2),
      new Vec2(this.petaPanel.width / 2, -this.petaPanel.height / 2),
      new Vec2(this.petaPanel.width / 2, this.petaPanel.height / 2),
      new Vec2(-this.petaPanel.width / 2, this.petaPanel.height / 2)
    ].map((v) => {
      return v.rotate(this.petaPanel.rotation)
    });
  }
  public destroy() {
    this.image.destroy();
    this.loader.destroy();
    super.destroy();
  }
}