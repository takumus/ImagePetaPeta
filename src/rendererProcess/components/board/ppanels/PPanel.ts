import { PetaPanel } from "@/commons/datas/petaPanel";
import { Vec2 } from "@/commons/utils/vec2";
import * as PIXI from "pixi.js";
import { AnimatedGIF } from '@/rendererProcess/utils/pixi-gif';
import { getImage } from "./ImageLoader";
import { valueChecker } from "@/commons/utils/valueChecker";
import NSFWImage from "@/@assets/nsfwBackground.png";
import NOIMAGEImage from "@/@assets/noImageBackground.png";
import LOADINGImage from "@/@assets/loadingBackground.png";
export class PPanel extends PIXI.Sprite {
  // public selected = false;
  public unselected = false;
  public dragging = false;
  public draggingOffset = new Vec2();
  public image = new PIXI.Sprite();
  public gif: AnimatedGIF | undefined;
  public imageWrapper = new PIXI.Sprite();
  public noImage = true;
  public loading = true;
  public onUpdateGIF: ((frame: number) => void) | undefined;
  private masker = new PIXI.Graphics();
  private selection = new PIXI.Graphics();
  private cover = new PIXI.Sprite();
  private nsfwTile?: PIXI.TilingSprite;
  private noImageTile?: PIXI.TilingSprite;
  private loadingTile?: PIXI.TilingSprite;
  private needToRender = valueChecker().isSameAll;
  private needToScaling = valueChecker().isSameAll;
  private defaultHeight = 0;
  private zoomScale = 1;
  private _cancelLoading? = () => { return; }
  public showNSFW = false;
  private static nsfwTexture?: PIXI.Texture;
  private static noImageTexture?: PIXI.Texture;
  private static loadingTexture?: PIXI.Texture;
  constructor(public petaPanel: PetaPanel) {
    super();
    this.anchor.set(0.5, 0.5);
    this.imageWrapper.mask = this.masker;
    this.imageWrapper.addChild(this.image);
    this.addChild(this.imageWrapper, this.masker, this.cover, this.selection);
    this.interactive = true;
    this.cover.visible = false;
    this.setPetaPanel(this.petaPanel);
    this.orderRender();
  }
  async init() {
    if (!PPanel.nsfwTexture) {
      PPanel.nsfwTexture = await PIXI.Texture.fromURL(NSFWImage);
    }
    if (!PPanel.noImageTexture) {
      PPanel.noImageTexture = await PIXI.Texture.fromURL(NOIMAGEImage);
    }
    if (!PPanel.loadingTexture) {
      PPanel.loadingTexture = await PIXI.Texture.fromURL(LOADINGImage);
    }
    this.nsfwTile = new PIXI.TilingSprite(PPanel.nsfwTexture, 100, 100);
    this.nsfwTile.visible = false;
    this.noImageTile = new PIXI.TilingSprite(PPanel.noImageTexture, 100, 100);
    this.loadingTile = new PIXI.TilingSprite(PPanel.loadingTexture, 100, 100);
    this.setZoomScale(this.zoomScale);
    this.cover.addChild(this.noImageTile, this.nsfwTile, this.loadingTile);
  }
  public setPetaPanel(petaPanel: PetaPanel) {
    this.petaPanel = petaPanel;
    this.defaultHeight = petaPanel.height / petaPanel.width;
  }
  public async load() {
    try {
      this.noImage = true;
      this.loading = true;
      const result = getImage(this.petaPanel._petaImage);
      this._cancelLoading = result.cancel;
      const image = await result.promise;
      this.loading = false;
      if (this.gif) {
        this.imageWrapper.removeChild(this.gif);
        this.gif.onFrameChange = undefined;
        this.gif.destroy();
        this.gif = undefined;
      }
      if (image.animatedGIF) {
        this.gif = image.animatedGIF;
        this.gif.onFrameChange = this.onUpdateGIF;
        this.imageWrapper.addChild(this.gif);
        if (this.petaPanel.gif.stopped) {
          this.gif.stop();
          this.gif.currentFrame = this.petaPanel.gif.frame;
        }
        this.noImage = false;
      } else if (image.texture) {
        try {
          this.image.texture = image.texture;
        } catch (error) {
          // console.log(error);
        }
        this.noImage = false;
      }
    } catch (error) {
      this.loading = false;
      throw error;
    }
  }
  public setZoomScale(scale: number) {
    if (this.needToScaling(
      "scale", scale,
      "nsfwTile", this.nsfwTile,
      "noImageTile", this.noImageTile,
      "loadingTile", this.loadingTile
    )) {
      return;
    }
    this.zoomScale = scale;
    this.nsfwTile?.tileScale.set(0.5 * (1 / this.zoomScale));
    this.noImageTile?.tileScale.set(0.5 * (1 / this.zoomScale));
    this.loadingTile?.tileScale.set(0.5 * (1 / this.zoomScale));
  }
  public orderRender() {
    try {
      // 前回の描画時と値に変更があるかチェック
      const showNSFW = (this.petaPanel._petaImage?.nsfw && !this.showNSFW) ? true : false;
      if (this.needToRender(
        "petaPanel.width", this.petaPanel.width,
        "petaPanel.height", this.petaPanel.height,
        "petaPanel.crop.width", this.petaPanel.crop.width,
        "petaPanel.crop.height", this.petaPanel.crop.height,
        "petaPanel.crop.position.x", this.petaPanel.crop.position.x,
        "petaPanel.crop.position.y", this.petaPanel.crop.position.y,
        "petaPanel.position.x", this.petaPanel.position.x,
        "petaPanel.position.y", this.petaPanel.position.y,
        "petaPanel.rotation", this.petaPanel.rotation,
        "petaPanel.visible", this.petaPanel.visible,
        "petaPanel.locked", this.petaPanel.locked,
        "unselected", this.unselected,
        "petaPanel._selected", this.petaPanel._selected,
        "noImage", this.noImage,
        "loading", this.loading,
        "nsfw", showNSFW,
        "nsfwTile", this.nsfwTile,
        "noImageTile", this.noImageTile,
        "loadingTile", this.loadingTile
      )) {
        return;
      }
      this.visible = this.petaPanel.visible;
      this.interactive = this.petaPanel.visible && !this.petaPanel.locked;
      const panelWidth = this.absPanelWidth();
      const panelHeight = this.absPanelHeight();
      const flippedX = this.petaPanel.width < 0;
      const flippedY = this.petaPanel.height < 0;
      this.imageWrapper.scale.set(
        flippedX ? -1 : 1,
        flippedY ? -1 : 1
      );
      this.imageWrapper.anchor.set(
        flippedX ? 1 : 0,
        flippedY ? 1 : 0
      );
      if (this.petaPanel.crop.width != 1 || this.petaPanel.crop.height != 1) {
        this.imageWrapper.mask = this.masker;
        this.masker.visible = true;
      } else {
        this.imageWrapper.mask = null;
        this.masker.visible = false;
      }
      const imageWidth = panelWidth * (1 / this.petaPanel.crop.width);
      const tempImageHeight = this.petaPanel._petaImage ? this.petaPanel._petaImage.height : this.defaultHeight;
      const imageHeight = panelWidth * tempImageHeight * (1 / this.petaPanel.crop.width);
      this.image.width = imageWidth;
      this.image.height = imageHeight;
      this.image.x = -panelWidth / 2 - this.petaPanel.crop.position.x * imageWidth;
      this.image.y = -panelHeight / 2 - this.petaPanel.crop.position.y * imageHeight;
      if (this.gif) {
        this.gif.width = this.image.width;
        this.gif.height = this.image.height;
        this.gif.x = this.image.x;
        this.gif.y = this.image.y;
      }
      if (this.imageWrapper.mask) {
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
      if (this.nsfwTile) {
        this.nsfwTile.x = -panelWidth / 2;
        this.nsfwTile.y = -panelHeight / 2;
        this.nsfwTile.width = panelWidth;
        this.nsfwTile.height = panelHeight;
        this.nsfwTile.tilePosition.set(panelWidth / 2, panelHeight / 2);
        this.nsfwTile.visible = showNSFW ? true : false;
      }
      if (this.noImageTile) {
        this.noImageTile.x = -panelWidth / 2;
        this.noImageTile.y = -panelHeight / 2;
        this.noImageTile.width = panelWidth;
        this.noImageTile.height = panelHeight;
        this.noImageTile.tilePosition.set(panelWidth / 2, panelHeight / 2);
        this.noImageTile.visible = this.noImage;
      }
      if (this.loadingTile) {
        this.loadingTile.x = -panelWidth / 2;
        this.loadingTile.y = -panelHeight / 2;
        this.loadingTile.width = panelWidth;
        this.loadingTile.height = panelHeight;
        this.loadingTile.tilePosition.set(panelWidth / 2, panelHeight / 2);
        this.loadingTile.visible = this.loading;
      }
      this.cover.visible = (this.nsfwTile?.visible || this.noImageTile?.visible || this.loadingTile?.visible) ? true : false;
      this.x = this.petaPanel.position.x;
      this.y = this.petaPanel.position.y;
      this.rotation = this.petaPanel.rotation;
    } catch (error) {
      // console.log(error);
    }
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
  public cancelLoading() {
    this._cancelLoading?.();
    this._cancelLoading = undefined;
  }
  public destroy() {
    this.image.destroy();
    this.gif?.destroy();
    this.cancelLoading();
    super.destroy();
  }
  public get isGIF() {
    return this.gif ? true : false;
  }
  public get isPlayingGIF() {
    return this.gif?.playing ? true : false;
  }
  public playGIF() {
    if (this.gif) {
      this.gif.play();
      this.petaPanel.gif.stopped = false;
    }
  }
  public stopGIF() {
    if (this.gif) {
      this.gif.stop();
      this.petaPanel.gif.frame = this.gif.currentFrame;
      this.petaPanel.gif.stopped = true;
    }
  }
  public updateGIF(deltaTime: number) {
    this.gif?.update(deltaTime);
  }
  private absPanelWidth() {
    return Math.abs(this.petaPanel.width);
  }
  private absPanelHeight() {
    return Math.abs(this.petaPanel.height);
  }
}