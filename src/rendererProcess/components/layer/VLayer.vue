<template>
  <article
    class="layer-root"
    :class="{
      hide: !$settings.visibleLayerPanel
    }"
    :style=" {
      zIndex: zIndex
    }"
  >
    <section
      class="title"
      @click.left="toggleVisible"
      :style="{
        backgroundImage: `url(${layerIconImage})`
      }"
    >
    </section>
    <section
      class="layer"
      ref="layersParent"
      v-show="$settings.visibleLayerPanel"
    >
      <ul ref="layers">
        <VLayerCell
          v-for="layerCellData in layerCellDatas"
          :key="layerCellData.id"
          :ref="`panel-${layerCellData.pPanel.petaPanel.id}`"
          :pPanel="layerCellData.pPanel"
          :draggingPPanel="draggingPPanel"
          @startDrag="startDrag"
          @click.right="rightClick(layerCellData.pPanel, $event)"
          @click.left="leftClick(layerCellData.pPanel, $event)"
        />
        <VLayerCell
          ref="cellDrag"
          :pPanel="draggingPPanel"
          :drag="true"
        />
      </ul>
    </section>
  </article>
</template>

<script lang="ts">
// Vue
import { Options, Vue } from "vue-class-component";
import { Prop, Ref, Watch } from "vue-property-decorator";
// Components
import VLayerCell from "@/rendererProcess/components/layer/VLayerCell.vue";
// Others
import LayerIcon from "@/@assets/layer.png";
import { Keyboards } from "@/rendererProcess/utils/keyboards";
import { PPanel } from "@/rendererProcess/components/board/ppanels/PPanel";
import { vec2FromMouseEvent } from "@/commons/utils/vec2";
@Options({
  components: {
    VLayerCell
  },
  emits: [
    "sortIndex",
    "petaPanelMenu",
    "update"
  ]
})
export default class VLayer extends Vue {
  @Prop()
  zIndex = 0;
  @Prop()
  pPanelsArray!: PPanel[];
  @Ref()
  layers!: HTMLElement;
  @Ref()
  layersParent!: HTMLElement;
  @Ref()
  cellDrag!: VLayerCell;
  keyboards = new Keyboards();
  draggingPPanel: PPanel | null = null;
  autoScrollVY = 0;
  mouseY = 0;
  fixedHeight = 0;
  async mounted() {
    this.keyboards.enabled = true;
    this.keyboards.down(["escape"], this.pressEscape);
    window.addEventListener("mousemove", this.mousemove);
    window.addEventListener("mouseup", this.mouseup);
    setInterval(() => {
      if (this.draggingPPanel) {
        this.layersParent.scrollTop += this.autoScrollVY;
        this.updateDragCell(this.mouseY);
        this.sort();
      }
    }, 1000 / 60);
  }
  unmounted() {
    this.keyboards.destroy();
    window.removeEventListener("mousemove", this.mousemove);
    window.removeEventListener("mouseup", this.mouseup);
  }
  pressEscape(pressed: boolean) {
    //
  }
  scrollTo(pPanel: PPanel) {
    const layerCell = this.$refs[`panel-${pPanel.petaPanel.id}`] as VLayerCell | undefined;
    if (!layerCell) {
      return;
    }
    this.layersParent.scrollTop = layerCell.$el.getBoundingClientRect().y - this.layersParent.getBoundingClientRect().y + this.layersParent.scrollTop;
  }
  startDrag(pPanel: PPanel, event: MouseEvent) {
    this.mouseY = event.clientY - this.layersParent.getBoundingClientRect().y;
    this.fixedHeight = this.layers.getBoundingClientRect().height;
    this.fixedHeight = this.fixedHeight < this.layersParent.getBoundingClientRect().height ? this.layersParent.getBoundingClientRect().height : this.fixedHeight;
    this.layers.style.height = this.fixedHeight + "px";
    this.layers.style.overflow = "hidden";
    this.draggingPPanel = pPanel;
    this.updateDragCell(this.mouseY);
    this.clearSelectionAll(true);
    pPanel.selected = true;
    this.sort();
    this.$emit("update");
  }
  mousemove(event: MouseEvent) {
    if (!this.draggingPPanel) {
      return;
    }
    this.mouseY = event.clientY - this.layersParent.getBoundingClientRect().y;
    this.updateDragCell(this.mouseY);
    this.sort();
    this.autoScroll(this.mouseY);
  }
  sort() {
    let changed = false;
    this.pPanels.map((pPanel) => {
      const layerCell = pPanel == this.draggingPPanel ? this.cellDrag : this.$refs[`panel-${pPanel.petaPanel.id}`] as VLayerCell;
      return {
        layerCell,
        y: layerCell.$el.getBoundingClientRect().y
      }
    }).sort((a, b) => {
      return b.y - a.y;
    }).forEach((v, index) => {
      if (!v.layerCell.pPanel) {
        return;
      }
      if (v.layerCell.pPanel.petaPanel.index != index) {
        changed = true;
      }
      v.layerCell.pPanel.petaPanel.index = index;
    });
    if (changed) {
      this.$emit("sortIndex");
    }
  }
  autoScroll(mouseY: number) {
    const height = this.layersParent.getBoundingClientRect().height;
    const autoScrollY = 20;
    if (mouseY < autoScrollY) {
      this.autoScrollVY = -(autoScrollY - mouseY);
    } else if (mouseY > height - autoScrollY) {
      this.autoScrollVY = (mouseY - (height - autoScrollY));
    } else {
      this.autoScrollVY = 0;
    }
  }
  updateDragCell(y: number, absolute = false) {
    const offset = this.cellDrag.$el.getBoundingClientRect().height / 2;
    this.cellDrag.$el.style.top = `${absolute ? y : (y + this.layersParent.scrollTop - offset)}px`;
  }
  mouseup(event: MouseEvent) {
    this.draggingPPanel = null;
    this.autoScrollVY = 0;
    this.layers.style.height = "unset";
    this.layers.style.overflow = "unset";
    this.updateDragCell(0, true);
  }
  rightClick(pPanel: PPanel, event: MouseEvent) {
    if (!pPanel.selected) {
      this.clearSelectionAll();
    }
    pPanel.selected = true;
    this.$emit("petaPanelMenu", pPanel, vec2FromMouseEvent(event));
  }
  leftClick(pPanel: PPanel, event: MouseEvent) {
    this.clearSelectionAll();
    pPanel.selected = true;
  }
  clearSelectionAll(force = false) {
    if (!Keyboards.pressed("shift") || force) {
      this.pPanelsArray.forEach((p) => {
        p.selected = false;
      });
    }
  }
  toggleVisible() {
    //
    this.$settings.visibleLayerPanel = !this.$settings.visibleLayerPanel;
  }
  get pPanels() {
    if (!this.pPanelsArray) {
      return [];
    }
    return this.pPanelsArray.sort((a, b) => {
      return b.petaPanel.index - a.petaPanel.index;
    });
  }
  get layerCellDatas() {
    return this.pPanels.map((pPanel, i) => {
      return {
        pPanel: pPanel,
        id: i
      }
    });
  }
  get layerIconImage() {
    return LayerIcon;
  }
}
</script>

<style lang="scss" scoped>
.layer-root {
  background-color: var(--bg-color);
  border-radius: var(--rounded);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  position: fixed;
  right: 0px;
  bottom: 0px;
  box-shadow: 0px 0px 3px 1px rgba(0, 0, 0, 0.4);
  margin: 8px;
  top: 63px;
  padding: 8px;
  >.title {
    display: block;
    cursor: pointer;
    text-align: center;
    background: no-repeat;
    background-position: center center;
    background-size: 14px;
    height: 14px;
    min-width: 14px;
    flex-shrink: 0;
    margin-bottom: 8px;
    filter: var(--icon-filter);
  }
  &.hide {
    top: unset;
    >.title {
      margin: 0px;
    }
  }
  >.layer {
    display: block;
    overflow-x: hidden;
    overflow-y: auto;
    height: 100%;
    flex: 1;
    >ul {
      margin: 0px;
      padding: 0px;
      position: relative;
    }
  }
}
</style>