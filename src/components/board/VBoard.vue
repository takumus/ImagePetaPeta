<template>
  <article class="board-root" ref="boardRoot">
    <section ref="panelsWrapper" class="panels-wrapper">
      <section ref="panelsBackground" class="panels-background">
        <div class="line vertical" :style="{ transform: `translateX(${centerX})` }"></div>
        <div class="line horizontal" :style="{ transform: `translateY(${centerY})` }"></div>
      </section>
      <section class="panels" :style="{
        transform: `translate(${transform.position.x}px, ${transform.position.y}px)`
      }">
        <VPanel
          v-for="panel in board.petaPanels"
          :key="panel.id"
          :petaPanel="panel"
          :transform="transform"
          @select="select"
          @toFront="toFront"
          @menu="petaPanelMenu"
          :ref="panel.id"
        />
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
      {{scalePercent}}%
    </section>
  </article>
</template>

<style lang="scss" scoped>
.board-root {
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
        background-color: #eeeeee;
        position: absolute;
        &.vertical {
          width: 1.5px;
          height: 100%;
        }
        &.horizontal {
          width: 100%;
          height: 1.5px;
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
    color: #333333;
  }
}
</style>

<script lang="ts">
import { Options, Vue } from "vue-class-component";
import VPanel from "@/components/board/VPanel.vue";
import VCrop from "@/components/board/VCrop.vue";
import { Board, BoardTransform, MenuType, MouseButton, PetaPanel } from "@/datas";
import { Prop, Ref, Watch } from "vue-property-decorator";
import { ClickChecker, Vec2 } from "@/utils";
import { API, log } from "@/api";
import GLOBALS from "@/globals";
import { fromMouseEvent } from "@/utils/vec2";
@Options({
  components: {
    VPanel,
    VCrop
  },
  emits: [
    "openBrowser"
  ]
})
export default class VBoard extends Vue {
  @Prop()
  board!: Board;
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
  globalOffset: Vec2 = new Vec2();
  petaPanelMenuListenerId = "";
  click = new ClickChecker();
  shiftKeyPressed = false;
  mounted() {
    this.panelsWrapper.addEventListener("mousedown", this.mousedown);
    this.panelsWrapper.addEventListener("dblclick", this.dblclick);
    this.panelsWrapper.addEventListener("mousewheel", this.wheel as any);
    this.panelsBackground.addEventListener("mousedown", this.mousedown);
    window.addEventListener("mouseup", this.mouseup);
    window.addEventListener("mousemove", this.mousemove);
    window.addEventListener("keydown", this.keydown);
    window.addEventListener("keyup", this.keyup);
    window.addEventListener("resize", this.resize);
    this.isMac = window.navigator.userAgent.indexOf("Macintosh") >= 0;
    this.$nextTick(this.resize);
  }
  unmounted() {
    this.panelsWrapper.removeEventListener("mousedown", this.mousedown);
    this.panelsWrapper.removeEventListener("dblclick", this.dblclick);
    this.panelsWrapper.removeEventListener("mousewheel", this.wheel as any);
    this.panelsBackground.removeEventListener("mousedown", this.mousedown);
    window.removeEventListener("mouseup", this.mouseup);
    window.removeEventListener("mousemove", this.mousemove);
    window.removeEventListener("keydown", this.keydown);
    window.removeEventListener("keyup", this.keyup);
    window.removeEventListener("resize", this.resize);
  }
  resize() {
    const rect = this.panelsBackground.getBoundingClientRect();
    this.globalOffset.x = rect.width / 2;
    this.globalOffset.y = rect.height / 2;
  }
  mousedown(e: MouseEvent) {
    if (e.button == MouseButton.RIGHT) {
      this.dragging = true;
    } else if (e.target == this.panelsBackground && e.button == MouseButton.LEFT) {
      this.dragging = true;
      this.draggingBackground = true;
      // clearSelection all
      this.clearSelectionAll();
    }
    this.click.down(e);
    if (!this.dragging) return;
    this.dragOffset.x = (this.board.transform.position.x - e.clientX);
    this.dragOffset.y = (this.board.transform.position.y - e.clientY);
  }
  mouseup(e: MouseEvent) {
    if (!this.dragging) return;
    if (e.button == MouseButton.RIGHT) {
      this.dragging = false;
      if (this.click.isClick && e.target == this.panelsBackground) {
        GLOBALS.contextMenu.open([{
          label: "Open Browser",
          click: () => {
            this.$emit("openBrowser");
          }
        }, { separate: true }, {
          label: "Reset Position",
          click: () => {
            this.resetTransform();
          }
        }], fromMouseEvent(e));
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
  }
  keydown(e: KeyboardEvent) {
    switch(e.key) {
      case "Backspace":
      case "Delete":
        this.removeSelectedPanels();
        break;
      case "Shift":
        this.shiftKeyPressed = true;
        break;
    }
  }
  keyup(e: KeyboardEvent) {
    switch(e.key) {
      case "Shift":
        this.shiftKeyPressed = false;
        break;
    }
  }
  wheel(event: WheelEvent) {
    const mouse = fromMouseEvent(event);
    mouse.add(this.globalOffset.clone().mult(-1));
    if (event.ctrlKey || !this.isMac) {
      const currentZoom = this.board.transform.scale;
      const currentPositionX = -this.board.transform.position.x;
      const currentPositionY = -this.board.transform.position.y;
      this.board.transform.scale *= 1 + -event.deltaY * (this.isMac ? 0.01 : 0.001);
      if (this.board.transform.scale > this.scaleMax) this.board.transform.scale = this.scaleMax;
      if (this.board.transform.scale < this.scaleMin) this.board.transform.scale = this.scaleMin;
      this.board.transform.position.x = -((currentPositionX + mouse.x) * (this.board.transform.scale / currentZoom) - mouse.x);
      this.board.transform.position.y = -((currentPositionY + mouse.y) * (this.board.transform.scale / currentZoom) - mouse.y);
    } else {
      this.board.transform.position.x += -event.deltaX;
      this.board.transform.position.y += -event.deltaY;
    }
  }
  dblclick(event: MouseEvent) {
    if (event.target != this.panelsBackground) return;
    this.resetTransform();
  }
  resetTransform() {
    this.board.transform.scale = 1;
    this.board.transform.position.x = 0;
    this.board.transform.position.y = 0;
  }
  removeSelectedPanels() {
    this.board.petaPanels = this.board.petaPanels.filter((pp) => !pp._selected);
  }
  petaPanelMenu(petaPanel: PetaPanel, position: Vec2) {
    GLOBALS.contextMenu.open([{
      label: "Crop",
      click: () => {
        this.editCrop(petaPanel);
      }
    }, { separate: true }, {
      label: "Flip Horizontal",
      click: () => {
        petaPanel.width = -petaPanel.width;
      }
    }, {
      label: "Flip Vertical",
      click: () => {
        petaPanel.height = -petaPanel.height;
      }
    }, { separate: true }, {
      label: "Reset",
      click: () => {
        petaPanel.height = Math.abs(petaPanel.height);
        petaPanel.width = Math.abs(petaPanel.width);
        petaPanel.crop.position.x = 0;
        petaPanel.crop.position.y = 0;
        petaPanel.crop.width = 1;
        petaPanel.crop.height = 1;
        petaPanel.rotation = 0;
      }
    }, { separate: true }, {
      label: "Remove",
      click: () => {
        this.removeSelectedPanels();
      }
    }], position);
  }
  addPanel(petaPanel: PetaPanel, worldPosition?: Vec2){
    petaPanel.index = this.getMaxIndex() + 1;
    petaPanel.position.x -= this.transform.position.x;
    petaPanel.position.y -= this.transform.position.y;
    petaPanel.position.x *= 1 / this.transform.scale;
    petaPanel.position.y *= 1 / this.transform.scale;
    petaPanel.width *= 1 / this.transform.scale;
    petaPanel.height = petaPanel.width * petaPanel.petaImage.height;
    this.toFront(petaPanel);
    this.select(petaPanel, worldPosition);
    if (worldPosition) {
      this.$nextTick(() => {
        const panelComponent = this.getVPanel(petaPanel);
        panelComponent.startDrag(worldPosition);
      });
    }
  }
  getVPanel(petaPanel: PetaPanel): VPanel {
    return this.$refs[petaPanel.id] as VPanel;
  }
  editCrop(petaPanel: PetaPanel) {
    this.croppingPetaPanel = petaPanel;
  }
  updateCrop() {
    this.croppingPetaPanel = null;
  }
  select(petaPanel: PetaPanel, worldPosition?: Vec2) {
    this.clearSelectionAll();
    petaPanel._selected = true;
    if (worldPosition) {
      this.$nextTick(() => {
        this.selectedPetaPanels.forEach((pp) => {
          this.getVPanel(pp).startDrag(worldPosition)
        })
      });
    }
  }
  clearSelectionAll() {
    if (!this.shiftKeyPressed) {
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
  load() {
    this.board.petaPanels.forEach((pp) => {
      this.getVPanel(pp).loadFullSize();
    });
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
  get transform(): BoardTransform {
    const transform: BoardTransform = {
      scale: this.board.transform.scale,
      position: this.board.transform.position.clone().add(this.globalOffset)
    }
    return transform;
  }
}
</script>
