import * as PIXI from "pixi.js";

import { RPetaPanel } from "@/commons/datas/rPetaPanel";
import { valueChecker } from "@/commons/utils/valueChecker";
import { Vec2 } from "@/commons/utils/vec2";

import { useCommonTextureStore } from "@/renderer/stores/commonTextureStore/useCommonTextureStore";
import { usePetaFilesStore } from "@/renderer/stores/petaFilesStore/usePetaFilesStore";
import { PFileObject } from "@/renderer/utils/pFileObject";
import { PPlayableFileObjectContent } from "@/renderer/utils/pFileObject/pPlayableFileObjectContainer";
import { PVideoFileObjectContent } from "@/renderer/utils/pFileObject/video";

export class PPetaPanel extends PIXI.Sprite {
  public unselected = false;
  public dragging = false;
  public draggingOffset = new Vec2();
  public imageWrapper = new PIXI.Sprite();
  public noImage = true;
  public loading = true;
  private masker = new PIXI.Graphics();
  private selection = new PIXI.Graphics();
  private cover = new PIXI.Sprite();
  private nsfwTile?: PIXI.TilingSprite;
  private noImageTile?: PIXI.TilingSprite;
  private loadingTile?: PIXI.TilingSprite;
  private needToRender = valueChecker();
  private needToScaling = valueChecker();
  private defaultHeight = 0;
  private zoomScale = 1;
  public pFileObject: PFileObject;
  public showNSFW = false;
  constructor(
    public petaPanel: RPetaPanel,
    private petaFilesStore: ReturnType<typeof usePetaFilesStore>,
    private commonTextureStore: ReturnType<typeof useCommonTextureStore>,
    public onUpdateRenderer: () => void,
  ) {
    super();
    this.pFileObject = new PFileObject();
    this.anchor.set(0.5, 0.5);
    this.imageWrapper.mask = this.masker;
    this.imageWrapper.addChild(this.pFileObject);
    this.addChild(this.imageWrapper, this.masker, this.cover, this.selection);
    this.interactive = true;
    this.cover.visible = false;
    this.nsfwTile = new PIXI.TilingSprite(this.commonTextureStore.NSFW, 100, 100);
    this.nsfwTile.visible = false;
    this.noImageTile = new PIXI.TilingSprite(this.commonTextureStore.NO, 100, 100);
    this.loadingTile = new PIXI.TilingSprite(this.commonTextureStore.LOADING, 100, 100);
    this.setZoomScale(this.zoomScale);
    this.cover.addChild(this.noImageTile, this.nsfwTile, this.loadingTile);
    this.setPetaPanel(this.petaPanel);
    this.orderRender();
  }
  public setPetaPanel(petaPanel: RPetaPanel) {
    this.petaPanel = petaPanel;
    this.defaultHeight = petaPanel.height / petaPanel.width;
  }
  public async load() {
    try {
      this.noImage = true;
      this.loading = true;
      const petaFile = this.petaFilesStore.getPetaFile(this.petaPanel.petaFileId);
      if (petaFile !== undefined) {
        await this.pFileObject.load(petaFile);
        if (this.pFileObject.content !== undefined) {
          this.pFileObject.content.event.on("updateRenderer", () => this.onUpdateRenderer());
        }
        if (this.petaPanel.status.type === "gif" || this.petaPanel.status.type === "video") {
          if (this.pFileObject.content instanceof PPlayableFileObjectContent) {
            this.pFileObject.content.setCurrentTime(this.petaPanel.status.time);
            this.pFileObject.content.setPaused(this.petaPanel.status.paused);
            this.pFileObject.content.setSpeed(this.petaPanel.status.speed);
            if (this.pFileObject.content instanceof PVideoFileObjectContent) {
              if (this.petaPanel.status.type === "video") {
                this.pFileObject.content.setVolume(this.petaPanel.status.volume);
              }
            }
          }
        }
        this.noImage = false;
        this.loading = false;
      }
    } catch (error) {
      this.loading = false;
      throw error;
    }
  }
  public setZoomScale(scale: number) {
    if (this.needToScaling(scale, this.nsfwTile, this.noImageTile, this.loadingTile)) {
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
      const petaFile = this.petaFilesStore.getPetaFile(this.petaPanel.petaFileId);
      const showNSFW = petaFile?.nsfw && !this.showNSFW ? true : false;
      if (
        this.needToRender(
          this.petaPanel.width,
          this.petaPanel.height,
          this.petaPanel.crop.width,
          this.petaPanel.crop.height,
          this.petaPanel.crop.position.x,
          this.petaPanel.crop.position.y,
          this.petaPanel.position.x,
          this.petaPanel.position.y,
          this.petaPanel.flipHorizontal,
          this.petaPanel.flipVertical,
          this.petaPanel.rotation,
          this.petaPanel.visible,
          this.petaPanel.locked,
          this.petaPanel.renderer.selected,
          this.pFileObject.content,
          this.unselected,
          this.noImage,
          this.loading,
          this.nsfwTile,
          this.noImageTile,
          this.loadingTile,
          showNSFW,
          Object.values(this.petaPanel.status).join("-"),
        )
      ) {
        return;
      }
      this.visible = this.petaPanel.visible;
      this.interactive = this.petaPanel.visible && !this.petaPanel.locked;
      const panelWidth = this.absPanelWidth();
      const panelHeight = this.absPanelHeight();
      this.imageWrapper.scale.set(
        this.petaPanel.flipHorizontal ? -1 : 1,
        this.petaPanel.flipVertical ? -1 : 1,
      );
      this.imageWrapper.anchor.set(
        this.petaPanel.flipHorizontal ? 1 : 0,
        this.petaPanel.flipVertical ? 1 : 0,
      );
      if (this.petaPanel.crop.width != 1 || this.petaPanel.crop.height != 1) {
        this.imageWrapper.mask = this.masker;
        this.masker.visible = true;
      } else {
        this.imageWrapper.mask = null;
        this.masker.visible = false;
      }
      const imageWidth = panelWidth * (1 / this.petaPanel.crop.width);
      const tempImageHeight = petaFile ? petaFile.metadata.height : this.defaultHeight;
      const tempImageWidth = petaFile ? petaFile.metadata.width : this.defaultHeight;
      const imageHeight =
        panelWidth * (tempImageHeight / tempImageWidth) * (1 / this.petaPanel.crop.width);
      if (this.pFileObject.content !== undefined) {
        this.pFileObject.content.setWidth(imageWidth);
        this.pFileObject.content.setHeight(imageHeight);
        this.pFileObject.content.x = -panelWidth / 2 - this.petaPanel.crop.position.x * imageWidth;
        this.pFileObject.content.y =
          -panelHeight / 2 - this.petaPanel.crop.position.y * imageHeight;
      }
      if (this.imageWrapper.mask) {
        this.masker.clear();
        this.masker.beginFill(0xff0000);
        this.masker.drawRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight);
      }
      this.selection.clear();
      if (this.unselected) {
        this.selection.beginFill(0x000000, 0.5);
        this.selection.drawRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight);
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
      this.cover.visible =
        this.nsfwTile?.visible || this.noImageTile?.visible || this.loadingTile?.visible
          ? true
          : false;
      this.x = this.petaPanel.position.x;
      this.y = this.petaPanel.position.y;
      this.rotation = this.petaPanel.rotation;
    } catch (error) {
      //
    }
  }
  public getCorners(offset = 0) {
    const w = this.absPanelWidth();
    const h = this.absPanelHeight();
    return [
      new Vec2(-w / 2 - offset, -h / 2 - offset),
      new Vec2(w / 2 + offset, -h / 2 - offset),
      new Vec2(w / 2 + offset, h / 2 + offset),
      new Vec2(-w / 2 - offset, h / 2 + offset),
    ] as const;
  }
  public getRect(offset = 0) {
    const corners = this.getCorners(offset);
    return {
      leftTop: corners[0],
      rightTop: corners[1],
      rightBottom: corners[2],
      leftBottom: corners[3],
    };
  }
  public destroy() {
    this.pFileObject.destroy();
    super.destroy();
  }
  private absPanelWidth() {
    return Math.abs(this.petaPanel.width);
  }
  private absPanelHeight() {
    return Math.abs(this.petaPanel.height);
  }
  public toLocal<P extends PIXI.IPointData = PIXI.Point>(
    position: PIXI.IPointData,
    from?: PIXI.DisplayObject | undefined,
    point?: P | undefined,
    skipUpdate?: boolean | undefined,
  ): P {
    if (
      this.position.x !== this.petaPanel.position.x ||
      this.position.y !== this.petaPanel.position.y ||
      this.rotation !== this.petaPanel.rotation
    ) {
      this.position.set(this.petaPanel.position.x, this.petaPanel.position.y);
      this.rotation = this.petaPanel.rotation;
    }
    return super.toLocal(position, from, point, skipUpdate);
  }
  public toGlobal<P extends PIXI.IPointData = PIXI.Point>(
    position: PIXI.IPointData,
    point?: P | undefined,
    skipUpdate?: boolean | undefined,
  ): P {
    if (
      this.position.x !== this.petaPanel.position.x ||
      this.position.y !== this.petaPanel.position.y ||
      this.rotation !== this.petaPanel.rotation
    ) {
      this.position.set(this.petaPanel.position.x, this.petaPanel.position.y);
      this.rotation = this.petaPanel.rotation;
    }
    return super.toGlobal(position, point, skipUpdate);
  }
}
