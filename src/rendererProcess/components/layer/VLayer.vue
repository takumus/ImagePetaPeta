<template>
  <t-layer-root
    :class="{
      hide: !statesStore.state.value.visibleLayerPanel,
    }"
    :style="{
      zIndex: zIndex,
    }"
  >
    <t-header @click.left="toggleVisible"> </t-header>
    <t-layers-parent v-show="statesStore.state.value.visibleLayerPanel" ref="layersParent">
      <t-layers ref="layers">
        <VLayerCell
          v-for="layerCellData in layerCellDatas"
          :key="layerCellData.id"
          :ref="(element) => setVLayerCellRef(element as any as VLayerCellInstance, layerCellData.data.id)"
          :pPanel="layerCellData.data"
          :cellData="layerCellData"
          :style="{
            visibility: draggingPPanel?.data === layerCellData.data ? 'hidden' : 'visible',
          }"
          @startDrag="sortHelper.startDrag"
          @update:cellData="updateCellData"
          @click.right="rightClick(layerCellData.data, $event)"
          @click.left="leftClick(layerCellData.data)"
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

<script setup lang="ts">
// Vue
import { computed, onBeforeUpdate, onMounted, onUnmounted, ref, watch } from "vue";
// Components
import VLayerCell from "@/rendererProcess/components/layer/VLayerCell.vue";
// Others
import { Keyboards } from "@/rendererProcess/utils/keyboards";
import { Vec2, vec2FromPointerEvent } from "@/commons/utils/vec2";
import { SortHelper } from "@/rendererProcess/components/utils/sortHelper";
import { PetaPanel } from "@/commons/datas/petaPanel";
import { useStateStore } from "@/rendererProcess/stores/statesStore";
type CellData = {
  data: PetaPanel;
  id: number;
};
type VLayerCellInstance = InstanceType<typeof VLayerCell>;
const statesStore = useStateStore();
const emit = defineEmits<{
  (e: "sortIndex"): void;
  (e: "petaPanelMenu", petaPanel: PetaPanel, position: Vec2): void;
  (e: "update:petaPanels", updates: PetaPanel[]): void;
}>();
const props = defineProps<{
  zIndex: number;
  pPanelsArray: PetaPanel[];
}>();
const layers = ref<HTMLElement>();
const layersParent = ref<HTMLElement>();
const cellDrag = ref<VLayerCellInstance>();
const draggingPPanelId = ref<string>();
const vLayerCells = ref<{ [key: string]: VLayerCellInstance }>({});
const sortHelper: SortHelper<CellData, VLayerCellInstance> = new SortHelper(
  (data) => {
    return vLayerCells.value[data.data.id];
  },
  (data) => {
    return data.data.index;
  },
  (changes) => {
    emit(
      "update:petaPanels",
      changes.map((change) => {
        return {
          ...change.data.data,
          index: change.index,
        };
      }),
    );
    emit("sortIndex");
  },
  (draggingData) => {
    draggingPPanelId.value = draggingData as string;
  },
  (data) => {
    return data.data.id;
  },
);
onMounted(() => {
  if (layers.value && layersParent.value && cellDrag.value) {
    sortHelper.init(layers.value, layersParent.value, cellDrag.value);
  }
});
onUnmounted(() => {
  sortHelper.destroy();
});
function changeLayerCellDatas() {
  sortHelper.layerCellDatas = layerCellDatas.value;
}
onBeforeUpdate(() => {
  vLayerCells.value = {};
});
function setVLayerCellRef(element: VLayerCellInstance, id: string) {
  vLayerCells.value[id] = element;
}
function scrollTo(pPanel: PetaPanel) {
  sortHelper.scrollTo({
    id: 0,
    data: pPanel,
  });
}
function rightClick(pPanel: PetaPanel, event: PointerEvent | MouseEvent) {
  if (!pPanel._selected) {
    clearSelectionAll();
  }
  pPanel._selected = true;
  emit("petaPanelMenu", pPanel, vec2FromPointerEvent(event));
}
function leftClick(pPanel: PetaPanel) {
  clearSelectionAll();
  pPanel._selected = true;
}
function clearSelectionAll(force = false) {
  if (!Keyboards.pressedOR("ShiftLeft", "ShiftRight") || force) {
    props.pPanelsArray.forEach((p) => {
      p._selected = false;
    });
  }
}
function toggleVisible() {
  statesStore.state.value.visibleLayerPanel = !statesStore.state.value.visibleLayerPanel;
}
function updateCellData(cellData: CellData) {
  emit("update:petaPanels", [
    {
      ...cellData.data,
    },
  ]);
}
const draggingPPanel = computed(() => {
  return layerCellDatas.value.find((cd) => cd.data.id === draggingPPanelId.value);
});
const layerCellDatas = computed((): CellData[] => {
  if (!props.pPanelsArray) {
    return [];
  }
  return [...props.pPanelsArray]
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
});
watch(() => layerCellDatas.value, changeLayerCellDatas);
defineExpose({
  scrollTo,
});
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
