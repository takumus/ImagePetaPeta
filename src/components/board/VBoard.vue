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
    <article
      class="image-cache"
      ref="imageCache"
      :style="{ zIndex: zIndex }"
    >
      <img
        v-for="url in cacheURLs"
        :key="url"
        :src="url"
      >
    </article>
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
import * as PIXI from 'pixi.js'
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
  scaleMin = 10 / 100;
  scaleMax = 1000 / 100;
  isMac = false;
  draggingBackground = false;
  petaPanelMenuListenerId = "";
  click = new ClickChecker();
  resizer?: ResizeObserver;
  viewSize = new Vec2();
  readyToLoad = false;
  pixi!: PIXI.Application;
  panelsSprite = new PIXI.Sprite();
  async mounted() {
    this.pixi = new PIXI.Application({
      resolution: window.devicePixelRatio,
      antialias: true
    });
    this.pixi.view.addEventListener("mousedown", this.mousedown);
    this.pixi.view.addEventListener("dblclick", this.dblclick);
    this.pixi.view.addEventListener("mousewheel", this.wheel as any);
    // this.panelsBackground.addEventListener("mousedown", this.mousedown);
    window.addEventListener("mouseup", this.mouseup);
    window.addEventListener("mousemove", this.mousemove);
    window.addEventListener("click", this.mousedownOutside);
    this.resizer = new ResizeObserver((entries) => {
      this.resize(entries[0].contentRect);
    });
    this.resizer.observe(this.panelsBackground);
    this.isMac = window.navigator.userAgent.indexOf("Macintosh") >= 0;
    // this.pixi.view.style.pointerEvents = "none";
    this.pixi.stage.addChild(this.panelsSprite);
    this.panelsBackground.appendChild(this.pixi.view);
    this.update();
  }
  unmounted() {
    this.pixi.view.removeEventListener("mousedown", this.mousedown);
    this.pixi.view.removeEventListener("dblclick", this.dblclick);
    this.pixi.view.removeEventListener("mousewheel", this.wheel as any);
    // this.panelsBackground.removeEventListener("mousedown", this.mousedown);
    window.removeEventListener("mouseup", this.mouseup);
    window.removeEventListener("mousemove", this.mousemove);
    window.removeEventListener("click", this.mousedownOutside);
    this.resizer?.unobserve(this.panelsBackground);
    this.resizer?.disconnect();
    this.panelsBackground.removeChild(this.pixi.view);
    this.pixi.destroy();
  }
  resize(rect: DOMRectReadOnly) {
    this.viewSize.x = rect.width;
    this.viewSize.y = rect.height;
    this.pixi.renderer.resize(rect.width, rect.height);
    this.pixi.view.style.width = rect.width + "px";
    this.pixi.view.style.height = rect.height + "px";
    this.panelsSprite.x = this.viewSize.x / 2;
    this.panelsSprite.y = this.viewSize.y / 2;
  }
  mousedownOutside(e: MouseEvent) {
    this.$nextTick(() => {
      let parent = e.target as HTMLElement;
      let inPanels = true;
      while (parent != this.panelsWrapper) {
        parent = parent.parentElement as HTMLElement;
        if (!parent) {
          inPanels = false;
          break;
        }
      }
      if (!inPanels) {
        this.clearSelectionAll(true);
      }
    });
  }
  mousedown(e: MouseEvent) {
    console.log(e);
    if (e.button == MouseButton.RIGHT) {
      this.dragging = true;
    }
    this.click.down(e);
    if (!this.dragging) return;
    this.dragOffset.x = (this.board.transform.position.x - e.clientX);
    this.dragOffset.y = (this.board.transform.position.y - e.clientY);
  }
  mouseup(e: MouseEvent) {
    // this.loadFullsized();
    if (!this.dragging) return;
    if (e.button == MouseButton.RIGHT) {
      this.dragging = false;
      if (this.click.isClick && e.target == this.panelsBackground) {
        this.$globalComponents.contextMenu.open([{
          label: this.$t("boards.menu.openBrowser"),
          click: () => {
            this.$globalComponents.browser.open();
          }
        }, { separate: true }, {
          label: this.$t("boards.menu.resetPosition"),
          click: () => {
            this.resetTransform();
          }
        }], vec2FromMouseEvent(e));
      }
    } else if (this.draggingBackground && e.button == MouseButton.LEFT) {
      this.dragging = false;
    }
  }
  mousemove(e: MouseEvent) {
    if (!this.dragging) return;
    this.board.transform.position.x = (e.clientX + this.dragOffset.x);
    this.board.transform.position.y = (e.clientY + this.dragOffset.y);
    this.click.move(e);
    this.update();
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
      this.board.transform.position.mult(-1).add(mouse).mult(this.board.transform.scale / currentZoom).sub(mouse).mult(-1);
    } else {
      this.board.transform.position.x += -event.deltaX;
      this.board.transform.position.y += -event.deltaY;
    }
    this.update();
  }
  update() {
    this.pixi.stage.x = this.board.transform.position.x;
    this.pixi.stage.y = this.board.transform.position.y;
    this.pixi.stage.scale.set(this.board.transform.scale);
  }
  dblclick(event: MouseEvent) {
    this.resetTransform();
  }
  resetTransform() {
    this.board.transform.scale = 1;
    this.board.transform.position.set(0, 0);
    this.update();
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
    petaPanel.index = this.getMaxIndex() + 1;
    petaPanel.position.sub(this.transform.position).mult(1 / this.transform.scale);
    petaPanel.width *= 1 / this.transform.scale;
    let height = 1;
    if (petaPanel._petaImage) {
      height = petaPanel._petaImage.height;
    }
    petaPanel.height = petaPanel.width * height;
    petaPanel._selected = true;
    this.toFront(petaPanel);
    // this.pressPetaPanel(petaPanel, worldPosition);
    if (worldPosition) {
      this.$nextTick(() => {
        const panelComponent = this.getVPanel(petaPanel);
        panelComponent?.load(ImageType.THUMBNAIL);
        panelComponent?.startDrag(worldPosition);
      });
    }
  }
  getVPanel(petaPanel: PetaPanel): VPanel | null {
    return this.$refs[petaPanel.id] as VPanel;
  }
  editCrop(petaPanel: PetaPanel) {
    this.croppingPetaPanel = petaPanel;
  }
  updateCrop() {
    this.croppingPetaPanel = null;
  }
  pressPetaPanel(petaPanel: PetaPanel, worldPosition?: Vec2) {
    if (!this.$keyboards.shift && (this.selectedPetaPanels.length <= 1 || !petaPanel._selected)) {
      // シフトなし。かつ、(１つ以下の選択か、自身が未選択の場合)
      // 最前にして選択リセット
      this.toFront(petaPanel);
      this.clearSelectionAll();
    }
    if (this.selectedPetaPanels.length <= 1) {
      // 選択が１つ以下の場合選択範囲リセット
      this.clearSelectionAll();
    }
    petaPanel._selected = true;
    if (worldPosition) {
      this.selectedPetaPanels.forEach((pp) => {
        this.getVPanel(pp)?.startDrag(worldPosition);
      });
    }
  }
  clickPetaPanel(petaPanel: PetaPanel) {
    this.clearSelectionAll();
    petaPanel._selected = true;
    if (!this.$keyboards.shift) {
      // シフトなしの場合最前へ。
      this.toFront(petaPanel);
    }
  }
  clearSelectionAll(force = false) {
    if (!this.$keyboards.shift || force) {
      this.board.petaPanels.forEach((p) => {
        p._selected = false;
      });
    }
  }
  toFront(petaPanel: PetaPanel) {
    const maxIndex = this.getMaxIndex();
    if (petaPanel.index == maxIndex) return;
    petaPanel.index = maxIndex + 1;
    [...this.board.petaPanels]
    .sort((a, b) => a.index - b.index)
    .forEach((pp, i) => {
      pp.index = i;
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
    this.readyToLoad = true;
    await this.loadFullsized();
  }
  async loadFullsized() {
    if (!this.readyToLoad) {
      return;
    }
    this.panelsSprite.children.length = 0;
    for (let i = 0; i < this.board.petaPanels.length; i++) {
      const petaPanel = this.board.petaPanels[i];
      const bunny = new PPanel(petaPanel);
      this.panelsSprite.addChild(bunny);
      await bunny.loadTexture(ImageType.FULLSIZED);
    }
  }
  get selectedPetaPanels() {
    return this.board.petaPanels.filter((pp) => pp._selected);
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
  get cacheURLs() {
    if (this.$settings.lowMemoryMode || !this.readyToLoad) {
      return [];
    }
    return Array.from(new Set(
      this.board.petaPanels
        .filter((p) => this.getPanelIsInside(p) && p._petaImage)
        .map((p) => ImageLoader.getImageURL(p._petaImage!, ImageType.FULLSIZED))
    ));
  }
  @Watch("$keyboards.delete")
  keyDelete(value: boolean) {
    if (value) {
      this.removeSelectedPanels();
    }
  }
  @Watch("board", { deep: true })
  changeBoard() {
    this.update();
    this.$emit("change", this.board);
  }
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
      cursor: grab !important;
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