<template>
  <article
    class="board-root"
    ref="boardRoot"
    :style="{
      backgroundColor: board.background.fillColor,
      zIndex: zIndex
    }"
  >
    <section
      ref="panelsWrapper"
      class="panels-wrapper"
    >
      <section
        ref="panelsBackground"
        class="panels-background"
      >
        <div
          class="line vertical"
          :style="{
            transform: `translateX(${centerX})`,
            backgroundColor: board.background.lineColor
          }"
        ></div>
        <div
          class="line horizontal"
          :style="{
            transform: `translateY(${centerY})`,
            backgroundColor: board.background.lineColor
          }"
        ></div>
      </section>
    </section>
    <section
      class="crop"
      v-if="croppingPetaPanel"
    >
      <VCrop
        :petaPanel="croppingPetaPanel"
        @update="updateCrop"
      />
    </section>
    <section class="info">
      <input
        type="color"
        v-model="board.background.fillColor"
        tabindex="-1"
      >
      <input
        type="color"
        v-model="board.background.lineColor"
        tabindex="-1"
      >
      <span class="zoom">{{scalePercent}}%</span>
    </section>
  </article>
</template>

<script lang="ts">
// Vue
import { Options, Vue } from "vue-class-component";
import { Prop, Ref, Watch } from "vue-property-decorator";
// Components
import VPanel from "@/components/board/VPanel.vue";
import VCrop from "@/components/board/VCrop.vue";
// Others
import { Vec2, vec2FromMouseEvent } from "@/utils/vec2";
import { PetaBoard, PetaBoardTransform } from "@/datas/petaBoard";
import { PetaPanel } from "@/datas/petaPanel";
import { MouseButton } from "@/datas/mouseButton";
import { ClickChecker } from "@/utils/clickChecker";
import { API, log } from "@/api";
import { ImageLoader } from "@/imageLoader";
import { BOARD_MAX_PETAPANEL_COUNT } from "@/defines";
import { ImageType } from "@/datas/imageType";
import { getURLFromImgTag } from "@/utils/getURLFromImgTag";
import * as PIXI from "pixi.js";
import { ILoaderAdd } from "pixi.js";
import { PetaImage } from "@/datas/petaImage";
import { PPanel } from "@/components/board/PPanel";
@Options({
  components: {
    VPanel,
    VCrop
  },
  emits: [
    "change"
  ]
})
export default class VBoard extends Vue {
  @Prop()
  board!: PetaBoard;
  @Prop()
  zIndex = 0;
  @Ref("panelsWrapper")
  panelsWrapper!: HTMLElement;
  @Ref("panelsBackground")
  panelsBackground!: HTMLElement;
  croppingPetaPanel?: PetaPanel | null = null;
  dragOffset = new Vec2();
  dragging = false;
  sizing = false;
  rotating = false;
  beginRotatingRotation = 0;
  rotatingRotation = 0;
  beginRotatingCorners: Vec2[] = [];
  scaleMin = 10 / 100;
  scaleMax = 1000 / 100;
  isMac = false;
  draggingBackground = false;
  petaPanelMenuListenerId = "";
  click = new ClickChecker();
  resizer?: ResizeObserver;
  viewSize = new Vec2();
  pixi!: PIXI.Application;
  rootContainer = new PIXI.Container();
  panelsCenterWrapper = new PIXI.Container();
  backgroundSprite = new PIXI.Graphics();
  ppanels: {[key: string]: PPanel} = {};
  debugGraphics = new PIXI.Graphics();
  corners: PIXI.Sprite[] = [];
  transformingPPanels: PPanel[] = [];
  sizingCornerIndex = -1;
  tcp = new Vec2();
  beginSizingPosition = new Vec2();
  beginSizingPetaPanels: PetaPanel[] = [];
  beginSizingDistance = 0;
  async mounted() {
    this.pixi = new PIXI.Application({
      resolution: window.devicePixelRatio,
      antialias: true
    });
    this.corners.push(new PIXI.Sprite());
    this.corners.push(new PIXI.Sprite());
    this.corners.push(new PIXI.Sprite());
    this.corners.push(new PIXI.Sprite());
    this.corners.forEach((c, i) => {
      const s = new PIXI.Graphics();
      s.beginFill(0xff0000);
      s.drawCircle(0, 0, 10);
      s.interactive = true;
      s.on("pointerdown", (e) => {
        this.beginSizing(i, e);
      });
      s.name = "transformer";

      const r = new PIXI.Graphics();
      r.beginFill(0x0000ff);
      r.drawCircle(0, 0, 20);
      r.interactive = true;
      r.on("pointerdown", (e) => {
        this.beginRotating(i, e);
      });
      r.name = "transformer";
      c.addChild(r, s);
    })
    this.pixi.view.addEventListener("dblclick", this.dblclick);
    this.pixi.view.addEventListener("mousewheel", this.wheel as any);
    this.resizer = new ResizeObserver((entries) => {
      this.resize(entries[0].contentRect);
    });
    this.resizer.observe(this.panelsBackground);
    this.isMac = window.navigator.userAgent.indexOf("Macintosh") >= 0;
    this.pixi.stage.addChild(this.backgroundSprite);
    this.pixi.stage.addChild(this.rootContainer);
    this.rootContainer.addChild(this.panelsCenterWrapper);
    this.rootContainer.addChild(this.debugGraphics);
    this.rootContainer.addChild(...this.corners);
    this.debugGraphics.interactive = false;
    this.panelsBackground.appendChild(this.pixi.view);
    this.pixi.stage.interactive = true;
    this.pixi.stage.on("pointerdown", this.mousedown);
    this.pixi.stage.on("pointerup", this.mouseup);
    this.pixi.stage.on("pointerupoutside", this.mouseup);
    this.pixi.stage.on("pointermove", this.mousemove);
    this.pixi.stage.on("pointermoveoutside", this.mousemove);
    this.pixi.ticker.add(() => {
      this.update();
    });
  }
  unmounted() {
    this.pixi.view.removeEventListener("dblclick", this.dblclick);
    this.pixi.view.removeEventListener("mousewheel", this.wheel as any);
    this.resizer?.unobserve(this.panelsBackground);
    this.resizer?.disconnect();
    this.panelsBackground.removeChild(this.pixi.view);
    this.pixi.destroy();
  }
  resize(rect: DOMRectReadOnly) {
    this.viewSize.set(rect.width, rect.height);
    this.pixi.renderer.resize(this.viewSize.x, this.viewSize.y);
    this.pixi.view.style.width = this.viewSize.x + "px";
    this.pixi.view.style.height = this.viewSize.y + "px";
    this.panelsCenterWrapper.x = this.viewSize.x / 2;
    this.panelsCenterWrapper.y = this.viewSize.y / 2;
    this.backgroundSprite.clear();
    this.backgroundSprite.beginFill(Number(this.board.background.fillColor.replace("#", "0x")));
    this.backgroundSprite.drawRect(0, 0, this.viewSize.x, this.viewSize.y);
  }
  beginSizing(index: number, e: PIXI.InteractionEvent) {
    this.sizing = true;
    this.sizingCornerIndex = index;
    this.beginSizingPosition = new Vec2(e.data.global);
    this.beginSizingPetaPanels = this.selectedPPanels.map((pp) => {
      const p = JSON.parse(JSON.stringify(pp.petaPanel));
      delete p._petaImage;
      return p;
    });
    this.tcp = new Vec2(this.corners[(this.sizingCornerIndex + 2) % 4]);
    this.beginSizingDistance = this.tcp.getDistance(this.corners[this.sizingCornerIndex]);
  }
  beginRotating(index: number, e: PIXI.InteractionEvent) {
    this.beginSizingPetaPanels = this.selectedPPanels.map((pp) => {
      const p = JSON.parse(JSON.stringify(pp.petaPanel));
      delete p._petaImage;
      return p;
    });
    this.beginRotatingCorners = [];
    this.corners.forEach((c) => {
      this.beginRotatingCorners.push(new Vec2(c));
    });
    this.rotatingRotation = this.getRotatingCenter().getDiff(this.rootContainer.toLocal(e.data.global)).atan2();
    this.beginRotatingRotation = this.rotatingRotation;
    this.rotating = true;
  }
  getRotatingCenter() {
    const center = new Vec2(0, 0);
    this.beginRotatingCorners.forEach((c) => {
      center.add(new Vec2(c));
    });
    return center.div(this.beginRotatingCorners.length);
  }
  mousedown(e: PIXI.InteractionEvent) {
    if (e.data.button == MouseButton.RIGHT) {
      this.dragging = true;
      this.dragOffset
      .copyFrom(this.board.transform.position)
      .sub(e.data.global);
    } else if (e.data.button == MouseButton.LEFT) {
      if (Object.values(this.ppanels).find((c) => c == e.target)) {
        const ppanel = e.target as PPanel;
        this.pointerdownPPanel(ppanel, e);
        return;
      }
      if (e.target.name == "transformer") {
        //
      } else {
        this.clearSelectionAll();
      }
    }
  }
  mouseup(e: PIXI.InteractionEvent) {
    // this.loadFullsized();
    this.sizing = false;
    this.rotating = false;
    if (e.data.button == MouseButton.RIGHT) {
      this.dragging = false;
      // if (this.click.isClick && e.target == this.panelsBackground) {
      //   this.$globalComponents.contextMenu.open([{
      //     label: this.$t("boards.menu.openBrowser"),
      //     click: () => {
      //       this.$globalComponents.browser.open();
      //     }
      //   }, { separate: true }, {
      //     label: this.$t("boards.menu.resetPosition"),
      //     click: () => {
      //       this.resetTransform();
      //     }
      //   }], vec2FromMouseEvent(e));
      // }
    } else if (e.data.button == MouseButton.LEFT) {
      Object.values(this.ppanels).forEach((pp) => {
        pp.dragging = false;
      });
    }
  }
  mousemove(e: PIXI.InteractionEvent) {
    if (this.sizing) {
      const scale = this.tcp.getDistance(this.rootContainer.toLocal(e.data.global)) / this.beginSizingDistance;
      this.selectedPPanels.forEach((pp, i) => {
        pp.petaPanel.width = this.beginSizingPetaPanels[i].width * scale;
        pp.petaPanel.height = this.beginSizingPetaPanels[i].height * scale;
        const position = this.tcp.getDiff(
          this.rootContainer.toLocal(
            this.panelsCenterWrapper.toGlobal(
              this.beginSizingPetaPanels[i].position
            )
          )
        );
        pp.petaPanel.position = this.panelsCenterWrapper.toLocal(
          this.rootContainer.toGlobal(
            position
            .clone()
            .normalize()
            .mult(position.getLength())
            .mult(scale)
            .add(this.tcp)
          )
        );
      })
    } else if (this.rotating) {
      const center = this.getRotatingCenter();
      this.rotatingRotation = center.getDiff(this.rootContainer.toLocal(e.data.global)).atan2();
      this.selectedPPanels.forEach((pp, i) => {
        pp.petaPanel.rotation = this.beginSizingPetaPanels[i].rotation + this.rotatingRotation - this.beginRotatingRotation;
        const diff = center.getDiff(
          this.rootContainer.toLocal(
            this.panelsCenterWrapper.toGlobal(
              this.beginSizingPetaPanels[i].position
            )
          )
        );
        const r = diff.atan2() + this.rotatingRotation - this.beginRotatingRotation;
        const globalPos2 = this.rootContainer.toGlobal(
          new Vec2(
            Math.cos(r),
            Math.sin(r)
          ).mult(diff.getLength()).add(center)
        );
        pp.petaPanel.position.copyFrom(this.panelsCenterWrapper.toLocal(globalPos2));
      });
    }
    Object.values(this.ppanels).filter((pp) => pp.dragging).forEach((pp) => {
      pp.petaPanel.position = new Vec2(this.panelsCenterWrapper.toLocal(e.data.global)).add(pp.draggingOffset);
    });
    if (!this.dragging) return;
    this.board.transform.position
    .copyFrom(e.data.global)
    .add(this.dragOffset);
    // this.click.move(e);
    // this.update();
  }
  wheel(event: WheelEvent) {
    const mouse = vec2FromMouseEvent(event);
    if (event.ctrlKey || !this.isMac) {
      const currentZoom = this.board.transform.scale;
      this.board.transform.scale *= 1 + -event.deltaY * (this.isMac ? 0.01 : 0.001);
      if (this.board.transform.scale > this.scaleMax) {
        this.board.transform.scale = this.scaleMax;
      } else if (this.board.transform.scale < this.scaleMin) {
        this.board.transform.scale = this.scaleMin;
      }
      this.board.transform.position
      .mult(-1)
      .add(mouse)
      .mult(this.board.transform.scale / currentZoom)
      .sub(mouse)
      .mult(-1);
    } else {
      this.board.transform.position.x += -event.deltaX;
      this.board.transform.position.y += -event.deltaY;
    }
    // this.update();
  }
  update() {
    this.board.transform.position.copyTo(this.rootContainer);
    this.rootContainer.scale.set(this.board.transform.scale);
    Object.values(this.ppanels).forEach((pp) => {
      pp.update();
    });
    if (this.rotating) {
      const center = this.getRotatingCenter();
      this.corners.forEach((c, i) => {
        const diff = center.getDiff(this.beginRotatingCorners[i]);
        const r = diff.atan2() + this.rotatingRotation - this.beginRotatingRotation;
        const d = diff.getLength();
        c.x = Math.cos(r) * d + center.x;
        c.y = Math.sin(r) * d + center.y;
      });
    } else {
      if (this.selectedPPanels.length == 1) {
        this.selectedPPanels[0].getCorners().forEach((c, i) => {
          c.add(this.selectedPPanels[0].petaPanel.position)
          .add(this.viewSize.clone().div(2));
          this.corners[i].x = c.x;
          this.corners[i].y = c.y;
        });
      } else {
        let minX = Number.MAX_SAFE_INTEGER;
        let minY = Number.MAX_SAFE_INTEGER;
        let maxX = Number.MIN_SAFE_INTEGER;
        let maxY = Number.MIN_SAFE_INTEGER;
        this.selectedPPanels.forEach((pp) => {
          pp.getCorners().forEach((c, i) => {
            c.add(pp.petaPanel.position);
            c.add(this.viewSize.clone().div(2));
            minX = Math.min(minX, c.x);
            minY = Math.min(minY, c.y);
            maxX = Math.max(maxX, c.x);
            maxY = Math.max(maxY, c.y);
          });
        });
        this.corners[0].x = minX;
        this.corners[0].y = minY;
        this.corners[1].x = maxX;
        this.corners[1].y = minY;
        this.corners[2].x = maxX;
        this.corners[2].y = maxY;
        this.corners[3].x = minX;
        this.corners[3].y = maxY;
      }
    }
    this.debugGraphics.clear();
    this.debugGraphics.lineStyle(2, 0x00ff00);
    this.debugGraphics.moveTo(this.corners[0].x, this.corners[0].y);
    for (let i = 1; i < this.corners.length + 1; i++) {
      const c = this.corners[i % this.corners.length];
      this.debugGraphics.lineTo(c.x, c.y);
    }
  }
  dblclick(event: MouseEvent) {
    this.resetTransform();
  }
  resetTransform() {
    this.board.transform.scale = 1;
    this.board.transform.position.set(0, 0);
    // this.update();
  }
  removeSelectedPanels() {
    this.board.petaPanels = this.board.petaPanels.filter((pp) => !pp._selected);
  }
  petaPanelMenu(petaPanel: PetaPanel, position: Vec2) {
    this.clearSelectionAll();
    petaPanel._selected = true;
    this.$globalComponents.contextMenu.open([{
      label: this.$t("boards.panelMenu.crop"),
      click: () => {
        this.editCrop(petaPanel);
      }
    }, { separate: true }, {
      label: this.$t("boards.panelMenu.flipHorizontal"),
      click: () => {
        petaPanel.width = -petaPanel.width;
      }
    }, {
      label: this.$t("boards.panelMenu.flipVertical"),
      click: () => {
        petaPanel.height = -petaPanel.height;
      }
    }, { separate: true }, {
      label: this.$t("boards.panelMenu.reset"),
      click: () => {
        petaPanel.height = Math.abs(petaPanel.height);
        petaPanel.width = Math.abs(petaPanel.width);
        petaPanel.crop.position.set(0, 0);
        petaPanel.crop.width = 1;
        petaPanel.crop.height = 1;
        petaPanel.rotation = 0;
      }
    }, { separate: true }, {
      label: this.$t("boards.panelMenu.remove"),
      click: () => {
        this.removeSelectedPanels();
      }
    }], position);
  }
  addPanel(petaPanel: PetaPanel, worldPosition?: Vec2){
    // petaPanel.index = this.getMaxIndex() + 1;
    // petaPanel.position.sub(this.transform.position).mult(1 / this.transform.scale);
    // petaPanel.width *= 1 / this.transform.scale;
    // let height = 1;
    // if (petaPanel._petaImage) {
    //   height = petaPanel._petaImage.height;
    // }
    // petaPanel.height = petaPanel.width * height;
    // petaPanel._selected = true;
    // this.toFront(petaPanel);
    // // this.pressPetaPanel(petaPanel, worldPosition);
    // if (worldPosition) {
    //   // this.$nextTick(() => {
    //   //   const panelComponent = this.getVPanel(petaPanel);
    //   //   panelComponent?.load(ImageType.THUMBNAIL);
    //   //   panelComponent?.startDrag(worldPosition);
    //   // });
    // }
  }
  editCrop(petaPanel: PetaPanel) {
    this.croppingPetaPanel = petaPanel;
  }
  updateCrop() {
    this.croppingPetaPanel = null;
  }
  clearSelectionAll(force = false) {
    if (!this.$keyboards.shift || force) {
      Object.values(this.ppanels).forEach((p) => {
        p.selected = false;
      });
    }
  }
  toFront(ppanel: PPanel) {
    const maxIndex = this.getMaxIndex();
    if (ppanel.petaPanel.index == maxIndex) return;
    ppanel.petaPanel.index = maxIndex + 1;
    this.board.petaPanels
    .sort((a, b) => a.index - b.index)
    .forEach((pp, i) => {
      pp.index = i;
    });
    this.sortIndex();
  }
  sortIndex() {
    this.panelsCenterWrapper.children.sort((a, b) => {
      return (a as PPanel).petaPanel.index - (b as PPanel).petaPanel.index;
    });
  }
  getMaxIndex() {
    return Math.max(...this.board.petaPanels.map((pp) => pp.index));
  }
  getPanelIsInside(panel: PetaPanel) {
    const panelWorldPosition = panel.position.clone().mult(this.transform.scale).add(this.transform.position);
    const panelWorldSize = new Vec2(panel.width, panel.height).getLength() / 2 * this.transform.scale;
    const inside = 
      Math.abs(panelWorldPosition.x - this.viewSize.x / 2) < panelWorldSize + this.viewSize.x / 2
      && Math.abs(panelWorldPosition.y - this.viewSize.y / 2) < panelWorldSize + this.viewSize.y / 2;
    return inside
  }
  async load() {
    log("load");
    // this.clearCache();
    if (this.board.petaPanels.length > 0) {
      this.pixi.ticker.stop();
    }
    await this.loadFullsized();
  }
  async loadFullsized() {
    Object.values(this.ppanels).forEach((pp) => {
      this.panelsCenterWrapper.removeChild(pp);
      pp.destroy();
    });
    this.ppanels = {};
    let loaded = 0;
    for (let i = 0; i < this.board.petaPanels.length; i++) {
      const petaPanel = this.board.petaPanels[i];
      const ppanel = new PPanel(petaPanel);
      this.ppanels[petaPanel.id] = ppanel;
      this.panelsCenterWrapper.addChild(ppanel);
      ppanel.loadTexture(ImageType.FULLSIZED).then(() => {
        loaded++;
        // log("loading", loaded, "/", this.board.petaPanels.length);
        if (loaded == this.board.petaPanels.length) {
          this.pixi.ticker.start();
          log("loaded", loaded);
        }
      });
    }
  }
  clearCache() {
    PIXI.utils.destroyTextureCache();
    PIXI.utils.clearTextureCache();
  }
  pointerdownPPanel(ppanel: PPanel, e: PIXI.InteractionEvent) {
    if (!this.$keyboards.shift && (this.selectedPPanels.length <= 1 || !ppanel.selected)) {
      // シフトなし。かつ、(１つ以下の選択か、自身が未選択の場合)
      // 最前にして選択リセット
      this.toFront(ppanel);
      this.clearSelectionAll();
    }
    if (this.selectedPPanels.length <= 1) {
      // 選択が１つ以下の場合選択範囲リセット
      this.clearSelectionAll();
    }
    ppanel.selected = true;
    Object.values(this.ppanels).filter((pp) => pp.selected).forEach((pp) => {
      const pos = new Vec2(e.data.global);
      pp.draggingOffset = new Vec2(pp.position).sub(this.panelsCenterWrapper.toLocal(pos));
      pp.dragging = true;
    });
  }
  pointerupPPanel(ppanel: PPanel, e: PIXI.InteractionEvent) {
    if (!ppanel.dragging) {
      return;
    }
    ppanel.dragging = false;
  }
  get selectedPPanels() {
    return Object.values(this.ppanels).filter((pp) => pp.selected);
  }
  get scalePercent() {
    return Math.floor(this.board.transform.scale * 100);
  }
  get centerX() {
    return Math.floor(this.transform.position.x) + "px";
  }
  get centerY() {
    return Math.floor(this.transform.position.y) + "px";
  }
  get transform(): PetaBoardTransform {
    const transform: PetaBoardTransform = {
      scale: this.board.transform.scale,
      position: this.board.transform.position.clone()
    }
    return transform;
  }
  @Watch("$keyboards.delete")
  keyDelete(value: boolean) {
    if (value) {
      this.removeSelectedPanels();
    }
  }
  // @Watch("board", { deep: true })
  // changeBoard() {
  //   this.update();
  //   this.$emit("change", this.board);
  // }
}
</script>

<style lang="scss" scoped>
.board-root {
  position: absolute;
  top: 0px;
  left: 0px;
  width: 100%;
  height: 100%;
  .panels-wrapper {
    position: absolute;
    top: 0px;
    left: 0px;
    width: 100%;
    height: 100%;
    z-index: 1;
    .panels {
      position: absolute;
      top: 0px;
      left: 0px;
      z-index: 2;
    }
    .panels-background {
      z-index: 1;
      position: absolute;
      top: 0px;
      left: 0px;
      width: 100%;
      height: 100%;
      .line {
        position: absolute;
        &.vertical {
          width: 1px;
          height: 100%;
        }
        &.horizontal {
          width: 100%;
          height: 1px;
        }
      }
    }
  }
  .crop {
    position: absolute;
    z-index: 3;
    top: 0px;
    left: 0px;
    width: 100%;
    height: 100%;
    background-color: rgba($color: #000000, $alpha: 0.7);
  }
  .info {
    position: absolute;
    z-index: 2;
    bottom: 0px;
    right: 0px;
    padding: 8px;
    .zoom {
      display: inline-block;
      vertical-align: top;
      padding: 4px;
      border-radius: var(--rounded);
      background-color: var(--bg-color);
    }
    input {
      display: inline-block;
      vertical-align: top;
      margin-right: 8px;
      border-radius: var(--rounded);
      height: 26px;
      background-color: var(--bg-color);
    }
  }
  .image-cache {
    position: fixed;
    pointer-events: none;
    z-index: 9999;
    top: 0px;
    left: 0px;
    width: 100%;
    height: 100%;
    img {
      position: fixed;
      bottom: -99990px;
      right: -99990px;
      width: 100000px;
      height: 100000px;
      opacity: 0.1;
      pointer-events: none;
    }
  }
}
</style>