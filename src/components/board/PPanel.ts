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
  constructor(public petaPanel: PetaPanel) {
    super();
    this.anchor.set(0.5, 0.5);
    this.image.anchor.set(0.5, 0.5);
    this.addChild(this.image);
    this.addChild(this.selectedOutline);
    this.interactive = true;
    PIXI.Ticker.shared.add(() => {
      this.update();
    });
  }
  public loadTexture(type: ImageType): Promise<PIXI.Texture> {
    const loader = new PIXI.Loader();
    return new Promise((res, rej) => {
      if (!this.petaPanel._petaImage) {
        rej();
        return;
      }
      const texture = loader.resources[this.petaPanel._petaImage.id]?.texture;
      if (texture) {
        this.texture = texture;
        this.update();
        res(texture);
        return;
      }
      loader.add(this.petaPanel._petaImage.id, ImageLoader.getImageURL(this.petaPanel._petaImage, type));
      loader.load((loader, resources) => {
        if (!this.petaPanel._petaImage) {
          rej();
          return;
        }
        this.image.texture = resources[this.petaPanel._petaImage.id].texture!;
        this.update();
        res(resources[this.petaPanel._petaImage.id].texture!);
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
}