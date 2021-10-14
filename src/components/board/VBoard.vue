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
      ref="panelsBackground"
      class="panels-wrapper"
    >
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
      <!-- <span class="zoom">{{scalePercent}}%</span> -->
    </section>
  </article>
</template>

<script lang="ts">
// Vue
import { Options, Vue } from "vue-class-component";
import { Prop, Ref, Watch } from "vue-property-decorator";
// Components
import VCrop from "@/components/board/VCrop.vue";
// Others
import { Vec2, vec2FromMouseEvent } from "@/utils/vec2";
import { PetaBoard, PetaBoardTransform } from "@/datas/petaBoard";
import { PetaPanel } from "@/datas/petaPanel";
import { MouseButton } from "@/datas/mouseButton";
import { ClickChecker } from "@/utils/clickChecker";
import { API, log } from "@/api";
import { ImageType } from "@/datas/imageType";
import * as PIXI from "pixi.js";
import { PPanel } from "@/components/board/ppanels/PPanel";
import { PTransformer } from "@/components/board/ppanels/PTransformer";
@Options({
  components: {
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
  @Ref("panelsBackground")
  panelsBackground!: HTMLElement;
  croppingPetaPanel?: PetaPanel | null = null;
  dragOffset = new Vec2();
  scaleMin = 10 / 100;
  scaleMax = 1000 / 100;
  isMac = false;
  click = new ClickChecker();
  resizer?: ResizeObserver;
  pixi!: PIXI.Application;
  rootContainer = new PIXI.Container();
  panelsCenterWrapper = new PIXI.Container();
  backgroundSprite = new PIXI.Graphics();
  pPanels: {[key: string]: PPanel} = {};
  pTransformer = new PTransformer();
  dragging = false;
  mounted() {
    this.pixi = new PIXI.Application({
      resolution: window.devicePixelRatio,
      antialias: true
    });
    this.pixi.view.addEventListener("dblclick", this.resetTransform);
    this.pixi.view.addEventListener("mousewheel", this.wheel as any);
    this.pixi.stage.on("pointerdown", this.mousedown);
    this.pixi.stage.on("pointerup", this.mouseup);
    this.pixi.stage.on("pointerupoutside", this.mouseup);
    this.pixi.stage.on("pointermove", this.mousemove);
    this.pixi.stage.on("pointermoveoutside", this.mousemove);
    this.pixi.stage.on("pointerup", (e) => this.pTransformer.mouseup(e));
    this.pixi.stage.on("pointerupoutside", (e) => this.pTransformer.mouseup(e));
    this.pixi.stage.on("pointermove", (e) => this.pTransformer.mousemove(e));
    this.pixi.stage.on("pointermoveoutside", (e) => this.pTransformer.mousemove(e));
    this.pixi.stage.addChild(this.backgroundSprite);
    this.pixi.stage.addChild(this.rootContainer);
    this.rootContainer.addChild(this.panelsCenterWrapper);
    this.rootContainer.addChild(this.pTransformer);
    this.panelsBackground.appendChild(this.pixi.view);
    this.pixi.stage.interactive = true;
    this.pixi.ticker.add(() => {
      this.update();
    });
    this.resizer = new ResizeObserver((entries) => {
      this.resize(entries[0].contentRect);
    });
    this.resizer.observe(this.panelsBackground);
    this.isMac = window.navigator.userAgent.indexOf("Macintosh") >= 0;
  }
  unmounted() {
    this.pixi.view.removeEventListener("dblclick", this.resetTransform);
    this.pixi.view.removeEventListener("mousewheel", this.wheel as any);
    this.resizer?.unobserve(this.panelsBackground);
    this.resizer?.disconnect();
    this.panelsBackground.removeChild(this.pixi.view);
    this.pixi.destroy();
  }
  resize(rect: DOMRectReadOnly) {
    this.pixi.renderer.resize(rect.width, rect.height);
    this.pixi.view.style.width = rect.width + "px";
    this.pixi.view.style.height = rect.height + "px";
    this.panelsCenterWrapper.x = rect.width / 2;
    this.panelsCenterWrapper.y = rect.height / 2;
    this.backgroundSprite.clear();
    this.backgroundSprite.beginFill(Number(this.board.background.fillColor.replace("#", "0x")));
    this.backgroundSprite.drawRect(0, 0, rect.width, rect.height);
  }
  mousedown(e: PIXI.InteractionEvent) {
    this.click.down(e.data.global);
    if (e.data.button == MouseButton.RIGHT) {
      this.dragging = true;
      this.dragOffset
      .set(this.board.transform.position)
      .sub(e.data.global);
    } else if (e.data.button == MouseButton.LEFT) {
      const pPanel = this.getPPanelFromObject(e.target);
      if (pPanel) {
        this.pointerdownPPanel(pPanel, e);
        return;
      }
      if (e.target.name != "transformer") {
        this.clearSelectionAll();
      }
    }
  }
  getPPanelFromObject(object: PIXI.DisplayObject) {
    if (this.pPanelsArray.find((c) => c == object)) {
      return object as PPanel;
    }
    return null;
  }
  mouseup(e: PIXI.InteractionEvent) {
    if (e.data.button == MouseButton.RIGHT) {
      if (this.click.isClick) {
        const pPanel = this.getPPanelFromObject(e.target);
        if (pPanel) {
          this.petaPanelMenu(pPanel.petaPanel, new Vec2(e.data.global));
        } else {
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
          }], new Vec2(e.data.global));
        }
      }
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
      this.pPanelsArray.forEach((pPanel) => {
        pPanel.dragging = false;
      });
    }
  }
  mousemove(e: PIXI.InteractionEvent) {
    this.click.move(e.data.global);
    this.pPanelsArray.filter((pPanel) => pPanel.dragging).forEach((pPanel) => {
      pPanel.petaPanel.position = new Vec2(this.panelsCenterWrapper.toLocal(e.data.global)).add(pPanel.draggingOffset);
    });
    if (!this.dragging) return;
    this.board.transform.position
    .set(e.data.global)
    .add(this.dragOffset);
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
  }
  update() {
    this.board.transform.position.setTo(this.rootContainer);
    this.rootContainer.scale.set(this.board.transform.scale);
    this.pPanelsArray.forEach((pPanel) => {
      pPanel.update();
    });
    this.pTransformer.setScale(1 / this.board.transform.scale);
    this.pTransformer.update();
  }
  resetTransform() {
    this.board.transform.scale = 1;
    this.board.transform.position.set(0, 0);
  }
  removeSelectedPanels() {
    this.pPanelsArray.filter((pPanel) => pPanel.selected).forEach((pPanel) => {
      this.removePPanel(pPanel);
    })
    this.board.petaPanels = this.pPanelsArray.map((pPanel) => pPanel.petaPanel);
  }
  removePPanel(pPanel: PPanel) {
    this.panelsCenterWrapper.removeChild(pPanel);
    pPanel.destroy();
    delete this.pPanels[pPanel.petaPanel.id];
  }
  petaPanelMenu(petaPanel: PetaPanel, position: Vec2) {
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
  async addPanel(petaPanel: PetaPanel, worldPosition?: Vec2){
    this.loadFullsized(petaPanel);
    const pPanel = this.pPanels[petaPanel.id];
    petaPanel.width *= 1 / this.board.transform.scale;
    petaPanel.height *= 1 / this.board.transform.scale;
    pPanel.dragging = true;
    pPanel.selected = true;
    this.toFront(pPanel);
  }
  editCrop(petaPanel: PetaPanel) {
    this.croppingPetaPanel = petaPanel;
  }
  updateCrop(petaPanel: PetaPanel) {
    if (!petaPanel._petaImage) {
      return;
    }
    this.croppingPetaPanel = null;
    const sign = 1;
    petaPanel.height = Math.abs(petaPanel.width * ((petaPanel.crop.height * petaPanel._petaImage.height) / (petaPanel.crop.width * petaPanel._petaImage.width))) * sign;
  }
  clearSelectionAll(force = false) {
    if (!this.$keyboards.shift || force) {
      this.pPanelsArray.forEach((p) => {
        p.selected = false;
      });
    }
  }
  toFront(pPanel: PPanel) {
    const maxIndex = this.getMaxIndex();
    pPanel.petaPanel.index = maxIndex + 1;
    this.board.petaPanels
    .sort((a, b) => a.index - b.index)
    .forEach((petaPanel, i) => {
      petaPanel.index = i;
    });
    this.sortIndex();
  }
  sortIndex() {
    this.panelsCenterWrapper.children.sort((a, b) => {
      return (a as PPanel).petaPanel.index - (b as PPanel).petaPanel.index;
    });
  }
  getMaxIndex() {
    return Math.max(...this.board.petaPanels.map((petaPanel) => petaPanel.index));
  }
  async load() {
    log("load");
    // this.clearCache();
    this.pPanelsArray.forEach((pPanel) => {
      this.removePPanel(pPanel);
    });
    this.pPanels = {};
    this.pTransformer.pPanels = this.pPanels;
    this.pixi.ticker.start();
    await this.loadAllFullsized();
  }
  async loadAllFullsized() {
    if (this.board.petaPanels.length > 0) {
      this.pixi.ticker.stop();
    }
    let loaded = 0;
    for (let i = 0; i < this.board.petaPanels.length; i++) {
      await this.loadFullsized(this.board.petaPanels[i]).then((result) => {
        loaded++;
        log("loaded", loaded);
        if (loaded % 10 == 0) {
          this.pixi.ticker.update();
        }
        if (loaded == this.board.petaPanels.length) {
          this.pixi.ticker.start();
          log("loaded", loaded);
        }
      });
    }
  }
  async loadFullsized(petaPanel: PetaPanel) {
    if (this.pPanels[petaPanel.id]) {
      return false;
    }
    const pPanel = new PPanel(petaPanel);
    this.pPanels[petaPanel.id] = pPanel;
    this.panelsCenterWrapper.addChild(pPanel);
    try {
      await pPanel.loadTexture(ImageType.FULLSIZED);
    } catch(err) {
      return false;
    }
    return true;
  }
  clearCache() {
    PIXI.utils.destroyTextureCache();
    PIXI.utils.clearTextureCache();
  }
  pointerdownPPanel(pPanel: PPanel, e: PIXI.InteractionEvent) {
    if (!this.$keyboards.shift && (this.selectedPPanels.length <= 1 || !pPanel.selected)) {
      // シフトなし。かつ、(１つ以下の選択か、自身が未選択の場合)
      // 最前にして選択リセット
      this.toFront(pPanel);
      this.clearSelectionAll();
    }
    if (this.selectedPPanels.length <= 1) {
      // 選択が１つ以下の場合選択範囲リセット
      this.clearSelectionAll();
    }
    pPanel.selected = true;
    this.selectedPPanels.forEach((pPanel) => {
      const pos = new Vec2(e.data.global);
      pPanel.draggingOffset = new Vec2(pPanel.position).sub(this.panelsCenterWrapper.toLocal(pos));
      pPanel.dragging = true;
    });
  }
  pointerupPPanel(pPanel: PPanel, e: PIXI.InteractionEvent) {
    if (!pPanel.dragging) {
      return;
    }
    pPanel.dragging = false;
  }
  get pPanelsArray() {
    return Object.values(this.pPanels);
  }
  get selectedPPanels() {
    return this.pPanelsArray.filter((pPanel) => pPanel.selected);
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