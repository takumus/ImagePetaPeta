<template>
  <e-layer-root
    :class="{
      hide: !statesStore.state.value.visibleLayerPanel,
    }"
    :style="{
      zIndex: zIndex,
    }">
    <e-header @click.left="toggleVisible"> </e-header>
    <e-layers-parent v-show="statesStore.state.value.visibleLayerPanel" ref="layersParent">
      <e-layers ref="layers">
        <VLayerCell
          v-for="pPanel in props.pPanelsArray"
          :key="pPanel.id"
          :ref="(element) => setVLayerCellRef(element as any as VLayerCellInstance, pPanel.id)"
          :peta-panel="pPanel"
          :selected="pPanel.renderer.selected"
          :sorting="draggingData !== undefined"
          @start-drag="sortHelper.pointerdown"
          @on-click="clickLayer"
          @update:peta-panel="updatePetaPanel"
          :style="{
            order: orders[pPanel.id] ?? props.pPanelsArray.length,
          }" />
      </e-layers>
      <e-drag-floating-tag-cell v-if="draggingData !== undefined" ref="floatingCellElement">
        <VLayerCell ref="cellDrag" :peta-panel="draggingData" :drag="true" />
      </e-drag-floating-tag-cell>
    </e-layers-parent>
  </e-layer-root>
</template>

<script setup lang="ts">
import { onBeforeUpdate, onUnmounted, ref, watch } from "vue";

import VLayerCell from "@/renderer/components/board/layer/VLayerCell.vue";

import { MouseButton } from "@/commons/datas/mouseButton";
import { RPetaPanel } from "@/commons/datas/rPetaPanel";
import { Vec2, vec2FromPointerEvent } from "@/commons/utils/vec2";

import {
  initSortHelper,
  SortHelperConstraint,
} from "@/renderer/components/browser/tags/sortHelper";
import { Keyboards } from "@/renderer/libs/keyboards";
import { useStateStore } from "@/renderer/stores/statesStore/useStatesStore";

type VLayerCellInstance = InstanceType<typeof VLayerCell>;
const statesStore = useStateStore();
const emit = defineEmits<{
  (e: "sortIndex"): void;
  (e: "petaPanelMenu", petaPanel: RPetaPanel, position: Vec2): void;
  (e: "update:petaPanels", updates: RPetaPanel[]): void;
  (e: "orderRender"): void;
}>();
const props = defineProps<{
  zIndex: number;
  pPanelsArray: RPetaPanel[];
}>();
const layers = ref<HTMLElement>();
const layersParent = ref<HTMLElement>();
const cellDrag = ref<VLayerCellInstance>();
const vLayerCells = ref<{ [key: string]: VLayerCellInstance }>({});
onBeforeUpdate(() => {
  vLayerCells.value = {};
});
onUnmounted(() => {
  sortHelper.destroy();
});
function setVLayerCellRef(element: VLayerCellInstance, id: string) {
  vLayerCells.value[id] = element;
}
//--------------------------------------------------------------------//
// ドラッグここから
//--------------------------------------------------------------------//
const draggingData = ref<RPetaPanel>();
const floatingCellElement = ref<HTMLElement>();
const orders = ref<{ [key: string]: number }>({});
const constraints = ref<{
  [key: string]: SortHelperConstraint;
}>({});
const sortHelper = initSortHelper<RPetaPanel>(
  {
    getElementFromId: (id) => vLayerCells.value[id]?.$el as HTMLElement,
    onChangeDraggingData: (data) => (draggingData.value = data),
    getIsDraggableFromId: () => true,
    onSort: () => {
      const updatedPetaPanels: RPetaPanel[] = [];
      props.pPanelsArray.forEach((petaPanel) => {
        const order = props.pPanelsArray.length - (orders.value[petaPanel.id] ?? 0);
        if (petaPanel.index !== order) {
          updatedPetaPanels.push({
            ...petaPanel,
            index: order,
          });
        }
      });
      emit("update:petaPanels", updatedPetaPanels);
      if (updatedPetaPanels.length > 0) {
        emit("sortIndex");
      }
    },
  },
  {
    orders,
    constraints,
    floatingCellElement,
  },
  {
    flexGap: 0,
  },
);
watch(
  () => props.pPanelsArray,
  () => {
    orders.value = {};
    constraints.value = {};
    props.pPanelsArray.forEach((petaTag) => {
      orders.value[petaTag.id] = props.pPanelsArray.length - petaTag.index;
      constraints.value[petaTag.id] = {
        insertToX: false,
        insertToY: true,
        moveX: true,
        moveY: true,
      };
    });
  },
  { immediate: true },
);
//--------------------------------------------------------------------//
// ドラッグここまで
//--------------------------------------------------------------------//
function clickLayer(event: PointerEvent, petaPanel: RPetaPanel) {
  if (event.button === MouseButton.LEFT) {
    clearSelectionAll();
    petaPanel.renderer.selected = true;
    emit("orderRender");
  } else if (event.button === MouseButton.RIGHT) {
    if (!petaPanel.renderer.selected) {
      clearSelectionAll();
    }
    petaPanel.renderer.selected = true;
    emit("petaPanelMenu", petaPanel, vec2FromPointerEvent(event));
  }
}
function clearSelectionAll(force = false) {
  if (!Keyboards.pressedOR("ShiftLeft", "ShiftRight") || force) {
    props.pPanelsArray.forEach((p) => {
      p.renderer.selected = false;
    });
  }
}
function toggleVisible() {
  statesStore.state.value.visibleLayerPanel = !statesStore.state.value.visibleLayerPanel;
}
function updatePetaPanel(petaPanel: RPetaPanel) {
  emit("update:petaPanels", [
    {
      ...petaPanel,
    },
  ]);
}
function scrollTo() {
  //
}
defineExpose({
  scrollTo,
});
</script>

<style lang="scss" scoped>
e-layer-root {
  display: flex;
  position: fixed;
  top: 50%;
  right: 0px;
  bottom: 0px;
  flex-direction: column;
  margin: var(--px-2);
  box-shadow: 1px 1px 5px rgba(0, 0, 0, 0.5);
  border-radius: var(--rounded);
  background-color: var(--color-0);
  padding: var(--px-2);
  width: 128px;
  overflow: hidden;
  &.hide {
    top: unset;
    width: unset;
    > e-header {
      margin: 0px;
    }
  }
  > e-header {
    display: block;
    flex-shrink: 0;
    filter: var(--filter-icon);
    cursor: pointer;
    margin-bottom: var(--px-2);
    background: no-repeat;
    background-image: url("/images/icons/layer.png");
    background-position: center center;
    background-size: 14px;
    min-width: 14px;
    height: 14px;
    text-align: center;
  }
  > e-layers-parent {
    display: block;
    flex: 1;
    clip-path: polygon(0 0, 0 100%, 100% 100%, 100% 0);
    height: 100%;
    overflow-x: hidden;
    overflow-y: auto;
    > e-layers {
      display: flex;
      position: relative;
      flex-direction: column;
      margin: 0px;
      padding: 0px;
      overflow-anchor: none;
    }
    > e-drag-target-line {
      position: fixed;
      top: 0px;
      left: 0px;
      transform-origin: top left;
      z-index: 999;
      width: 0px;
      height: 0px;
      &::after {
        display: block;
        transform: translate(-50%, -50%);
        border-radius: 99px;
        background-color: var(--color-accent-2);
        width: 100%;
        height: 100%;
        content: "";
      }
    }
    > e-drag-floating-tag-cell {
      position: fixed;
      top: 0px;
      left: 0px;
      transform-origin: top right;
      visibility: hidden;
      opacity: 0.9;
      z-index: 999;
      pointer-events: none;
    }
  }
}
</style>
