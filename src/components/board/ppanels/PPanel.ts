import { ImageType } from "@/datas/imageType";
import { PetaPanel } from "@/datas/petaPanel";
import { getImageURL } from "@/utils/imageURL";
import { Vec2 } from "@/utils/vec2";
import * as PIXI from "pixi.js";
export class PPanel extends PIXI.Sprite {
  public selected = false;
  public unselected = false;
  public dragging = false;
  public draggingOffset = new Vec2();
  public image = new PIXI.Sprite();
  public noImage = false;
  private masker = new PIXI.Graphics();
  private selection = new PIXI.Graphics();
  private cover = new PIXI.Graphics();
  private coverLabel = new PIXI.Text("?", {
    fontFamily: window.getComputedStyle(document.body).getPropertyValue("font-family"),
    fontWeight: "bold",
    fill: 0x666666,
    fontSize: 64
  });
  private loader = new PIXI.Loader();
  private isSameAll = valueChecker().isSameAll;
  private defaultHeight = 0;
  public showNsfw = false;
  constructor(public petaPanel: PetaPanel) {
    super();
    this.anchor.set(0.5, 0.5);
    this.image.mask = this.masker;
    this.addChild(this.image, this.masker, this.cover, this.coverLabel, this.selection);
    this.interactive = true;
    this.cover.visible = false;
    this.coverLabel.visible = false;
    this.coverLabel.anchor.set(0.5, 0.5);
    this.defaultHeight = petaPanel.height / petaPanel.width;
    this.update();
  }
  public loadTexture(type: ImageType): Promise<void> {
    const url = this.petaPanel._petaImage ? getImageURL(this.petaPanel._petaImage, type): "";
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
        this.image.texture = resources[getImageURL(this.petaPanel._petaImage, type)].texture!;
        this.noImage = false;
        this.update();
        res();
      });
    });
  }
  public update() {
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
      "unselected", this.unselected,
      "selected", this.selected,
      "noImage", this.noImage,
      "nsfw", this.petaPanel._petaImage?.nsfw && !this.showNsfw
    )) {
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
      const clr = this.coverLabel.width / this.coverLabel.height;
      const ilr = this.petaPanel.width / this.petaPanel.height;
      const scale = 0.3;
      if (clr > ilr) {
        this.coverLabel.width = this.petaPanel.width * scale;
        this.coverLabel.height = this.petaPanel.width / clr  * scale;
      } else {
        this.coverLabel.height = this.petaPanel.height * scale;
        this.coverLabel.width = this.petaPanel.height * clr * scale;
      }
    } else {
      this.cover.visible = this.coverLabel.visible = false;
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
  function isSame(key: string, value: any) {
    if (values[key] != value) {
      values[key] = value;
      return false;
    }
    return true;
  }
  function isSameAll(...pairs: any[]) {
    let result = true;
    for (let i = 0; i < pairs.length / 2; i++) {
      const key = pairs[i * 2] as string;
      const value = pairs[i * 2 + 1];
      if (!isSame(key, value)) {
        result = false;
      }
    }
    return result;
  }
  return {
    isSame,
    isSameAll
  };
}