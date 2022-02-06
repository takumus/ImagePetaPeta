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
  public noImage = false;
  private masker = new PIXI.Graphics();
  private selection = new PIXI.Graphics();
  private noImageGraphics = new PIXI.Graphics();
  private loader = new PIXI.Loader();
  private isSame = valueChecker();
  private defaultHeight = 0;
  constructor(public petaPanel: PetaPanel) {
    super();
    this.anchor.set(0.5, 0.5);
    // this.image.anchor.set(0.5, 0.5);
    this.image.mask = this.masker;
    this.addChild(this.image, this.masker, this.noImageGraphics, this.selection);
    this.interactive = true;
    this.noImageGraphics.visible = false;
    this.defaultHeight = petaPanel.height / petaPanel.width;
    this.update();
  }
  public loadTexture(type: ImageType): Promise<void> {
    const url = this.petaPanel._petaImage ? ImageLoader.getImageURL(this.petaPanel._petaImage, type): "";
    this.noImage = true;
    return new Promise((res, rej) => {
      if (!this.petaPanel._petaImage) {
        rej("_petaImage is undefined");
        return;
      }
      const texture = PIXI.utils.TextureCache[url];
      if (texture) {
        this.image.texture = texture;
        this.noImage = false;
        this.update();
        res();
        return;
      }
      this.loader.add(url);
      this.loader.onError.add((error) => {
        rej("cannot load texture");
      });
      this.loader.load((_, resources) => {
        if (!this.petaPanel._petaImage) {
          rej("cannot load texture");
          return;
        }
        this.image.texture = resources[ImageLoader.getImageURL(this.petaPanel._petaImage, type)].texture!;
        this.noImage = false;
        this.update();
        res();
      });
    });
  }
  public update() {
    // if (!this.petaPanel._petaImage) {
    //   return;
    // }
    if (
      this.isSame("petaPanel.width", this.petaPanel.width)
      && this.isSame("petaPanel.height", this.petaPanel.height)
      && this.isSame("petaPanel.crop.width", this.petaPanel.crop.width)
      && this.isSame("petaPanel.crop.height", this.petaPanel.crop.height)
      && this.isSame("petaPanel.crop.position.x", this.petaPanel.crop.position.x)
      && this.isSame("petaPanel.crop.position.y", this.petaPanel.crop.position.y)
      && this.isSame("petaPanel.position.x", this.petaPanel.position.x)
      && this.isSame("petaPanel.position.y", this.petaPanel.position.y)
      && this.isSame("petaPanel.rotation", this.petaPanel.rotation)
      && this.isSame("unselected", this.unselected)
      && this.isSame("selected", this.selected)
    ) {
      return;
    }
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
    const tempImageHeight = this.petaPanel._petaImage ? this.petaPanel._petaImage.height : this.defaultHeight;
    const imageHeight = panelWidth * tempImageHeight * (1 / this.petaPanel.crop.width);
    this.image.width = imageWidth;
    this.image.height = imageHeight;
    this.image.x = -panelWidth / 2 - (flippedX ? 1 - this.petaPanel.crop.position.x - this.petaPanel.crop.width : this.petaPanel.crop.position.x) * imageWidth;
    this.image.y = -panelHeight / 2 - (flippedY ? 1 - this.petaPanel.crop.position.y - this.petaPanel.crop.height : this.petaPanel.crop.position.y) * imageHeight;
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
    this.noImageGraphics.visible = this.noImage;
    if (this.noImage) {
      this.noImageGraphics.clear();
      this.noImageGraphics.beginFill(0xCCCCCC, 1);
      this.noImageGraphics.drawRect(
        -panelWidth / 2,
        -panelHeight / 2,
        panelWidth,
        panelHeight
      );
      this.noImageGraphics.lineStyle(1, 0x333333, 1, undefined, true);
      this.noImageGraphics.moveTo(-panelWidth / 2, -panelHeight / 2);
      this.noImageGraphics.lineTo(-panelWidth / 2 + panelWidth, -panelHeight / 2 + panelHeight);
      this.noImageGraphics.moveTo(-panelWidth / 2 + panelWidth, -panelHeight / 2);
      this.noImageGraphics.lineTo(-panelWidth / 2, -panelHeight / 2 + panelHeight);
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
function valueChecker() {
  const values: {[key: string]: any} = {};
  return function(key: string, value: any) {
    if (values[key] != value) {
      values[key] = value;
      return false;
    }
    return true;
  }
}