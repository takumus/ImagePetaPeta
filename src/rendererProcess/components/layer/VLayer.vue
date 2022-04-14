<template>
  <article
    class="layer-root"
    v-show="visible"
    :style=" {
      zIndex: zIndex
    }"
  >
    <section class="layer" ref="layersParent">
      <ul ref="layers">
        <VLayerCell
          v-for="panelData in panelDatasWithId"
          :key="panelData.id"
          :ref="`panel-${panelData.panelData.petaPanel.id}`"
          :layerCellData="panelData.panelData"
          :currentDraggingId="draggingPanelId"
          @startDrag="startDrag"
          @click.right="rightClick(panelData.panelData, $event)"
          @click.left="leftClick(panelData.panelData, $event)"
        />
        <VLayerCell
          ref="cellDrag"
          :layerCellData="draggingPanelData"
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
import { Keyboards } from "@/rendererProcess/utils/keyboards";
import { PPanel } from "@/rendererProcess/components/board/ppanels/PPanel";
import { vec2FromMouseEvent } from "@/commons/utils/vec2";
@Options({
  components: {
    VLayerCell
  },
  emits: [
    "sortIndex",
    "petaPanelMenu"
  ]
})
export default class VLayer extends Vue {
  @Prop()
  visible = true;
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
  draggingPanelId = "";
  draggingPanelData: PPanel | null = null;
  autoScrollVY = 0;
  mouseY = 0;
  fixedHeight = 0;
  async mounted() {
    this.keyboards.enabled = true;
    this.keyboards.down(["escape"], this.pressEscape);
    window.addEventListener("mousemove", this.mousemove);
    window.addEventListener("mouseup", this.mouseup);
    setInterval(() => {
      if (this.draggingPanelId !== "") {
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
  startDrag(panelData: PPanel, event: MouseEvent) {
    this.mouseY = event.clientY - this.layersParent.getBoundingClientRect().y;
    this.fixedHeight = this.layers.getBoundingClientRect().height;
    this.fixedHeight = this.fixedHeight < this.layersParent.getBoundingClientRect().height ? this.layersParent.getBoundingClientRect().height : this.fixedHeight;
    this.layers.style.height = this.fixedHeight + "px";
    this.layers.style.overflow = "hidden";
    this.draggingPanelId = panelData.petaPanel.id;
    this.draggingPanelData = panelData;
    this.updateDragCell(this.mouseY);
    this.clearSelectionAll(true);
    panelData.selected = true;
    this.sort();
  }
  mousemove(event: MouseEvent) {
    if (this.draggingPanelId == "") {
      return;
    }
    this.mouseY = event.clientY - this.layersParent.getBoundingClientRect().y;
    this.updateDragCell(this.mouseY);
    this.sort();
    this.autoScroll(this.mouseY);
  }
  sort() {
    let changed = false;
    this.panelDatas.map((panelData) => {
      const layerCell = panelData.petaPanel.id == this.draggingPanelId ? this.cellDrag : this.$refs[`panel-${panelData.petaPanel.id}`] as VLayerCell;
      return {
        layerCell,
        y: layerCell.$el.getBoundingClientRect().y
      }
    }).sort((a, b) => {
      return b.y - a.y;
    }).forEach((v, index) => {
      if (!v.layerCell.layerCellData) {
        return;
      }
      if (v.layerCell.layerCellData.petaPanel.index != index) {
        changed = true;
      }
      v.layerCell.layerCellData.petaPanel.index = index;
    });
    if (changed) {
      this.$emit("sortIndex");
      console.log("changed");
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
    this.draggingPanelId = "";
    this.draggingPanelData = null;
    this.autoScrollVY = 0;
    this.layers.style.height = "unset";
    this.layers.style.overflow = "unset";
    this.updateDragCell(0, true);
  }
  rightClick(panelData: PPanel, event: MouseEvent) {
    if (!panelData.selected) {
      this.clearSelectionAll();
    }
    panelData.selected = true;
    this.$emit("petaPanelMenu", panelData, vec2FromMouseEvent(event));
  }
  leftClick(panelData: PPanel, event: MouseEvent) {
    this.clearSelectionAll();
    panelData.selected = true;
  }
  clearSelectionAll(force = false) {
    if (!Keyboards.pressed("shift") || force) {
      this.pPanelsArray.forEach((p) => {
        p.selected = false;
      });
    }
  }
  get panelDatas() {
    if (!this.pPanelsArray) {
      return [];
    }
    return this.pPanelsArray.sort((a, b) => {
      return b.petaPanel.index - a.petaPanel.index;
    });
  }
  get panelDatasWithId() {
    return this.panelDatas.map((pd, i) => {
      return {
        panelData: pd,
        id: i
      }
    });
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
  margin: 16px;
  height: 50%;
  >.layer {
    overflow-x: hidden;
    overflow-y: scroll;
    height: 100%;
    >ul {
      margin: 0px;
      padding: 0px;
      position: relative;
    }
  }
}
</style>