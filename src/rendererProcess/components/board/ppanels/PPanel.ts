import { PetaPanel } from "@/commons/datas/petaPanel";
import { Vec2 } from "@/commons/utils/vec2";
import * as PIXI from "pixi.js";
import { AnimatedGIF } from '@pixi/gif';
import { getImage } from "./ImageLoader";
import { promiseSerial } from "@/commons/utils/promiseSerial";
import { clearTextureCache } from "@pixi/utils";
import { valueChecker } from "@/commons/utils/valueChecker";
export class PPanel extends PIXI.Sprite {
  public selected = false;
  public unselected = false;
  public dragging = false;
  public draggingOffset = new Vec2();
  public image = new PIXI.Sprite();
  public gif: AnimatedGIF | undefined;
  public imageWrapper = new PIXI.Sprite();
  public noImage = true;
  public onUpdateGIF: ((frame: number) => void) | undefined;
  private masker = new PIXI.Graphics();
  private selection = new PIXI.Graphics();
  private cover = new PIXI.Graphics();
  private coverLabel = new PIXI.Text("?", {
    fontFamily: window.getComputedStyle(document.body).getPropertyValue("font-family"),
    fontWeight: "bold",
    fill: 0x666666,
    fontSize: 64
  });
  private isSameAll = valueChecker().isSameAll;
  private defaultHeight = 0;
  public showNsfw = false;
  constructor(public petaPanel: PetaPanel) {
    super();
    this.anchor.set(0.5, 0.5);
    this.imageWrapper.mask = this.masker;
    this.imageWrapper.addChild(this.image);
    this.addChild(this.imageWrapper, this.masker, this.cover, this.coverLabel, this.selection);
    this.interactive = true;
    this.cover.visible = false;
    this.coverLabel.visible = false;
    this.coverLabel.anchor.set(0.5, 0.5);
    this.setPetaPanel(this.petaPanel);
    this.update();
    // this.cursor = "move";
  }
  public setPetaPanel(petaPanel: PetaPanel) {
    this.petaPanel = petaPanel;
    this.defaultHeight = petaPanel.height / petaPanel.width;
  }
  public async load() {
    this.noImage = true;
    const result = await getImage(this.petaPanel._petaImage);
    if (this.gif) {
      this.imageWrapper.removeChild(this.gif);
      this.gif.onFrameChange = undefined;
      this.gif.destroy();
      this.gif = undefined;
    }
    if (result.animatedGIF) {
      this.gif = result.animatedGIF;
      this.gif.onFrameChange = this.onUpdateGIF;
      this.imageWrapper.addChild(this.gif);
      if (this.petaPanel.gif.stopped) {
        this.gif.stop();
        this.gif.currentFrame = this.petaPanel.gif.frame;
      }
      this.noImage = false;
    } else if (result.texture) {
      try {
        this.image.texture = result.texture;
      } catch (error) {
        // console.log(error);
      }
      this.noImage = false;
    }
  }
  public update() {
    try {
      // 前回の描画時と値に変更があるかチェック
      if (this.isSameAll(
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
        "selected", this.selected,
        "noImage", this.noImage,
        "nsfw", this.petaPanel._petaImage?.nsfw && !this.showNsfw
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
      if (this.noImage) {
        this.coverLabel.text = "?";
      } else if (this.petaPanel._petaImage?.nsfw && !this.showNsfw) {
        this.coverLabel.text = "NSFW";
      }
      if (this.noImage || (this.petaPanel._petaImage?.nsfw && !this.showNsfw)) {
        this.cover.visible = this.coverLabel.visible = true;
        this.cover.clear();
        this.cover.beginFill(0xffffff, 1);
        this.cover.drawRect(
          -panelWidth / 2,
          -panelHeight / 2,
          panelWidth,
          panelHeight
        );
        this.coverLabel.scale.set(1, 1);
        const scale = 0.3;
        // 縦横比で縦横どちらを基準にするか決める。
        if (this.coverLabel.width / this.coverLabel.height > this.petaPanel.width / this.petaPanel.height) {
          this.coverLabel.scale.set((this.petaPanel.width * scale) / this.coverLabel.width);
        } else {
          this.coverLabel.scale.set((this.petaPanel.height * scale) / this.coverLabel.height);
        }
      } else {
        this.cover.visible = this.coverLabel.visible = false;
      }
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
  public destroy() {
    this.image.destroy();
    this.gif?.destroy();
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