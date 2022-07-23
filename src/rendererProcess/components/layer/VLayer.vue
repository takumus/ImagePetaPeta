<template>
  <t-layer-root
    :class="{
      hide: !$states.visibleLayerPanel
    }"
    :style=" {
      zIndex: zIndex
    }"
  >
    <t-header
      @click.left="toggleVisible"
    >
    </t-header>
    <t-layers-parent
      v-show="$states.visibleLayerPanel"
      ref="layersParent"
    >
      <t-layers ref="layers">
        <VLayerCell
          v-for="layerCellData in layerCellDatas"
          :key="layerCellData.id"
          :ref="(element) => setVLayerCellRef(element, layerCellData.data.petaPanel.id)"
          :pPanel="layerCellData.data"
          :cellData="layerCellData"
          :style="{
            visibility: draggingPPanel?.data === layerCellData.data ? 'hidden' : 'visible'
          }"
          @startDrag="sortHelper.startDrag"
          @click.right="rightClick(layerCellData.data, $event)"
          @click.left="leftClick(layerCellData.data, $event)"
        />
        <VLayerCell
          ref="cellDrag"
          :pPanel="draggingPPanel?.data"
          :cellData="draggingPPanel"
          :drag="true"
          :style="{
            visibility: !draggingPPanel ? 'hidden' : 'visible'
          }"
        />
      </t-layers>
    </t-layers-parent>
  </t-layer-root>
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
import { vec2FromPointerEvent } from "@/commons/utils/vec2";
import { API } from "@/rendererProcess/api";
import { SortHelper } from "../utils/sortHelper";
type CellData = {
  data: PPanel,
  id: number
}
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
  draggingPPanel: CellData | null = null;
  vLayerCells: { [key: string]: VLayerCell} = {};
  sortHelper: SortHelper<CellData> = new SortHelper(
    (data) => {
      return this.vLayerCells[data.data.petaPanel.id];
    },
    (data) => {
      return data.data.petaPanel.index;
    },
    (data, index) => {
      data.data.petaPanel.index = index;
    },
    () => {
      this.$emit("sortIndex");
    },
    (draggingData) => {
      this.draggingPPanel = draggingData;
    }
  );
  async mounted() {
    this.sortHelper.init(this.layers, this.layersParent, this.cellDrag);
  }
  unmounted() {
    this.sortHelper.destroy();
  }
  @Watch("layerCellDatas")
  changeLayerCellDatas() {
    this.sortHelper.layerCellDatas = this.layerCellDatas;
  }
  beforeUpdate() {
    this.vLayerCells = {};
  }
  setVLayerCellRef(element: VLayerCell, id: string) {
    this.vLayerCells[id] = element;
  }
  scrollTo(pPanel: PPanel) {
    this.sortHelper.scrollTo({
      id: 0,
      data: pPanel
    });
  }
  rightClick(pPanel: PPanel, event: PointerEvent) {
    if (!pPanel.selected) {
      this.clearSelectionAll();
    }
    pPanel.selected = true;
    this.$emit("petaPanelMenu", pPanel, vec2FromPointerEvent(event));
  }
  leftClick(pPanel: PPanel, event: PointerEvent) {
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
    this.$states.visibleLayerPanel = !this.$states.visibleLayerPanel;
  }
  get layerCellDatas(): CellData[] {
    if (!this.pPanelsArray) {
      return [];
    }
    return this.pPanelsArray.sort((a, b) => {
      return b.petaPanel.index - a.petaPanel.index;
    }).map((pPanel, i) => {
      // これを挟まないと、更新時スクロール位置が変わる。バグ？なんで？
      return {
        data: pPanel,
        id: i
      }
    });
  }
}
</script>

<style lang="scss" scoped>
t-layer-root {
  background-color: var(--bg-color);
  border-radius: var(--rounded);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  position: fixed;
  right: 0px;
  bottom: 0px;
  box-shadow: 1px 1px 5px rgba(0, 0, 0, 0.5);
  margin: 8px;
  padding: 8px;
  top: 50%;
  width: 128px;
  &.hide {
    top: unset;
    width: unset;
    >t-header {
      margin: 0px;
    }
  }
  >t-header {
    display: block;
    cursor: pointer;
    text-align: center;
    background: no-repeat;
    background-position: center center;
    background-size: 14px;
    background-image: url("~@/@assets/layer.png");
    height: 14px;
    min-width: 14px;
    flex-shrink: 0;
    margin-bottom: 8px;
    filter: var(--icon-filter);
  }
  >t-layers-parent {
    display: block;
    overflow-x: hidden;
    overflow-y: auto;
    height: 100%;
    flex: 1;
    >t-layers {
      display: block;
      margin: 0px;
      padding: 0px;
      position: relative;
    }
  }
}
</style>