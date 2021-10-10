import { ImageType } from '@/datas/imageType';
import { PetaImage } from '@/datas/petaImage';
import { PetaPanel } from '@/datas/petaPanel';
import { ImageLoader } from '@/imageLoader';
import * as PIXI from 'pixi.js';
export class PPanel extends PIXI.Sprite {
  constructor(private petaPanel: PetaPanel) {
    super();
    this.anchor.set(0.5, 0.5);
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
        this.texture = resources[this.petaPanel._petaImage.id].texture!;
        this.update();
        res(resources[this.petaPanel._petaImage.id].texture!);
      });
    });
  }
  public update() {
    this.width = this.petaPanel.width;
    this.height = this.petaPanel.height;
    this.x = this.petaPanel.position.x;
    this.y = this.petaPanel.position.y;
    this.rotation = this.petaPanel.rotation;
  }
  public get index() {
    return this.petaPanel.index;
  }
}