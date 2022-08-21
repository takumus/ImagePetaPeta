<template>
  <t-layer-root
    :class="{
      hide: !$states.visibleLayerPanel,
    }"
    :style="{
      zIndex: zIndex,
    }"
  >
    <t-header @click.left="toggleVisible"> </t-header>
    <t-layers-parent v-show="$states.visibleLayerPanel" ref="layersParent">
      <t-layers ref="layers">
        <VLayerCell
          v-for="layerCellData in layerCellDatas"
          :key="layerCellData.id"
          :ref="(element) => setVLayerCellRef(element, layerCellData.data.id)"
          :pPanel="layerCellData.data"
          :cellData="layerCellData"
          :style="{
            visibility: draggingPPanel?.data === layerCellData.data ? 'hidden' : 'visible',
          }"
          @startDrag="sortHelper.startDrag"
          @update:cellData="updateCellData"
          @click.right="rightClick(layerCellData.data, $event)"
          @click.left="leftClick(layerCellData.data, $event)"
        />
        <VLayerCell
          ref="cellDrag"
          :pPanel="draggingPPanel?.data"
          :cellData="draggingPPanel"
          :drag="true"
          :style="{
            visibility: !draggingPPanel ? 'hidden' : 'visible',
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
import { vec2FromPointerEvent } from "@/commons/utils/vec2";
import { API } from "@/rendererProcess/api";
import { SortHelper } from "@/rendererProcess/components/utils/sortHelper";
import { PetaPanel } from "@/commons/datas/petaPanel";
import { toRaw } from "vue";
import { emit } from "process";
type CellData = {
  data: PetaPanel;
  id: number;
};
@Options({
  components: {
    VLayerCell,
  },
  emits: ["sortIndex", "petaPanelMenu", "update", "update:petaPanels"],
})
export default class VLayer extends Vue {
  @Prop()
  zIndex = 0;
  @Prop()
  pPanelsArray!: PetaPanel[];
  @Ref()
  layers!: HTMLElement;
  @Ref()
  layersParent!: HTMLElement;
  @Ref()
  cellDrag!: typeof VLayerCell;
  draggingPPanelId: string | null = null;
  vLayerCells: { [key: string]: typeof VLayerCell } = {};
  sortHelper: SortHelper<CellData> = new SortHelper(
    (data) => {
      return this.vLayerCells[data.data.id] as any;
    },
    (data) => {
      return data.data.index;
    },
    (changes) => {
      this.$emit(
        "update:petaPanels",
        changes.map((change) => {
          return {
            ...change.data.data,
            index: change.index,
          };
        }),
      );
      this.$emit("sortIndex");
    },
    (draggingData) => {
      this.draggingPPanelId = draggingData as string;
    },
    (data) => {
      return data.data.id;
    },
  );
  async mounted() {
    this.sortHelper.init(this.layers, this.layersParent, this.cellDrag as any);
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
  setVLayerCellRef(element: typeof VLayerCell, id: string) {
    this.vLayerCells[id] = element;
  }
  scrollTo(pPanel: PetaPanel) {
    this.sortHelper.scrollTo({
      id: 0,
      data: pPanel,
    });
  }
  rightClick(pPanel: PetaPanel, event: PointerEvent) {
    if (!pPanel._selected) {
      this.clearSelectionAll();
    }
    pPanel._selected = true;
    this.$emit("petaPanelMenu", pPanel, vec2FromPointerEvent(event));
  }
  leftClick(pPanel: PetaPanel, event: PointerEvent) {
    this.clearSelectionAll();
    pPanel._selected = true;
  }
  clearSelectionAll(force = false) {
    if (!Keyboards.pressedOR("ShiftLeft", "ShiftRight") || force) {
      this.pPanelsArray.forEach((p) => {
        p._selected = false;
      });
    }
  }
  toggleVisible() {
    this.$states.visibleLayerPanel = !this.$states.visibleLayerPanel;
  }
  updateCellData(cellData: CellData) {
    this.$emit("update:petaPanels", [
      {
        ...cellData.data,
      },
    ]);
  }
  get draggingPPanel() {
    return this.layerCellDatas.find((cd) => cd.data.id === this.draggingPPanelId);
  }
  get layerCellDatas(): CellData[] {
    if (!this.pPanelsArray) {
      return [];
    }
    return [...this.pPanelsArray]
      .sort((a, b) => {
        return b.index - a.index;
      })
      .map((pPanel, i) => {
        // これを挟まないと、更新時スクロール位置が変わる。バグ？なんで？
        return {
          data: pPanel,
          id: i,
        };
      });
  }
}
</script>

<style lang="scss" scoped>
t-layer-root {
  background-color: var(--color-main);
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
    > t-header {
      margin: 0px;
    }
  }
  > t-header {
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
    filter: var(--filter-icon);
  }
  > t-layers-parent {
    display: block;
    overflow-x: hidden;
    overflow-y: auto;
    height: 100%;
    flex: 1;
    > t-layers {
      display: block;
      margin: 0px;
      padding: 0px;
      position: relative;
    }
  }
}
</style>
