import { ImageType } from '@/datas/imageType';
import { PetaImage } from '@/datas/petaImage';
import { PetaPanel } from '@/datas/petaPanel';
import { ImageLoader } from '@/imageLoader';
import { Vec2 } from '@/utils/vec2';
import * as PIXI from 'pixi.js';
export class PPanel extends PIXI.Sprite {
  public selected = false;
  public unselected = false;
  public dragging = false;
  public draggingOffset = new Vec2();
  public image = new PIXI.Sprite();
  private masker = new PIXI.Graphics();
  private selection = new PIXI.Graphics();
  private loader = new PIXI.Loader();
  private prevWidth = 0;
  private prevHeight = 0;
  private prevSelected = false;
  private prevCropWidth = 0;
  private prevCropHeight = 0;
  private prevCropX = 0;
  private prevCropY = 0;
  private prevPositionX = 0;
  private prevPositionY = 0;
  private prevRotation = 0;
  private prevUnselected = false;
  constructor(public petaPanel: PetaPanel) {
    super();
    this.anchor.set(0.5, 0.5);
    // this.image.anchor.set(0.5, 0.5);
    this.image.mask = this.masker;
    this.addChild(this.image, this.masker, this.selection);
    this.interactive = true;
    this.update();
  }
  public loadTexture(type: ImageType): Promise<void> {
    const url = this.petaPanel._petaImage ? ImageLoader.getImageURL(this.petaPanel._petaImage, type): "";
    return new Promise((res, rej) => {
      if (!this.petaPanel._petaImage) {
        rej("_petaImage is undefined");
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
          rej("cannot load texture");
          return;
        }
        this.image.texture = resources[ImageLoader.getImageURL(this.petaPanel._petaImage, type)].texture!;
        this.update();
        res();
      });
    });
  }
  public update() {
    if (!this.petaPanel._petaImage) {
      return;
    }
    if (!(
      this.prevWidth != this.petaPanel.width
      || this.prevHeight != this.petaPanel.height
      || this.prevSelected != this.selected
      || this.prevCropWidth != this.petaPanel.crop.width
      || this.prevCropHeight != this.petaPanel.crop.height
      || this.prevCropX != this.petaPanel.crop.position.x
      || this.prevCropY != this.petaPanel.crop.position.y
      || this.prevPositionX != this.petaPanel.position.x
      || this.prevPositionY != this.petaPanel.position.y
      || this.prevRotation != this.petaPanel.rotation
      || this.prevUnselected != this.unselected
    )) {
      return;
    }
    this.prevWidth = this.petaPanel.width;
    this.prevHeight = this.petaPanel.height;
    this.prevSelected = this.selected;
    this.prevCropWidth = this.petaPanel.crop.width;
    this.prevCropHeight = this.petaPanel.crop.height;
    this.prevCropX = this.petaPanel.crop.position.x;
    this.prevCropY = this.petaPanel.crop.position.y;
    this.prevPositionX = this.petaPanel.position.x;
    this.prevPositionY = this.petaPanel.position.y;
    this.prevRotation = this.petaPanel.rotation;
    this.prevUnselected = this.unselected;
    const panelWidth = this.absPanelWidth();
    const panelHeight = this.absPanelHeight();
    const flippedX = this.petaPanel.width < 0;
    const flippedY = this.petaPanel.height < 0;
    this.image.scale.set(
      flippedX ? -1 : 1,
      flippedY ? -1 : 1
    );
    this.image.anchor.set(
      flippedX ? 1 : 0,
      flippedY ? 1 : 0
    );
    if (this.petaPanel.crop.width != 1 || this.petaPanel.crop.height != 1) {
      this.image.mask = this.masker;
      this.masker.visible = true;
    } else {
      this.image.mask = null;
      this.masker.visible = false;
    }
    const imageWidth = panelWidth * (1 / this.petaPanel.crop.width);
    const imageHeight = panelWidth * this.petaPanel._petaImage.height * (1 / this.petaPanel.crop.width);
    this.image.width = imageWidth;
    this.image.height = imageHeight;
    this.image.x = -panelWidth / 2 - this.petaPanel.crop.position.x * imageWidth;
    this.image.y = -panelHeight / 2 - this.petaPanel.crop.position.y * imageHeight;
    if (this.image.mask) {
      this.masker.clear();
      this.masker.beginFill(0xff0000);
      this.masker.drawRect(
        -panelWidth / 2,
        -panelHeight / 2,
        panelWidth,
        panelHeight
      );
    }
    this.selection.clear();
    if (this.unselected) {
      this.selection.beginFill(0x000000, 0.5);
      this.selection.drawRect(
        -panelWidth / 2,
        -panelHeight / 2,
        panelWidth,
        panelHeight
      );
    }
    this.x = this.petaPanel.position.x;
    this.y = this.petaPanel.position.y;
    this.rotation = this.petaPanel.rotation;
  }
  public getCorners(offset = 0): Vec2[] {
    const w = this.absPanelWidth();
    const h = this.absPanelHeight();
    return [
      new Vec2(-w / 2 - offset, -h / 2 - offset),
      new Vec2(w / 2 + offset, -h / 2 - offset),
      new Vec2(w / 2 + offset, h / 2 + offset),
      new Vec2(-w / 2 - offset, h / 2 + offset)
    ];
  }
  public destroy() {
    this.image.destroy();
    this.loader.destroy();
    super.destroy();
  }
  private absPanelWidth() {
    return Math.abs(this.petaPanel.width);
  }
  private absPanelHeight() {
    return Math.abs(this.petaPanel.height);
  }
}