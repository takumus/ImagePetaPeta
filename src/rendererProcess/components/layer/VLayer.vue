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
          v-for="pPanel in props.pPanelsArray"
          :key="pPanel.id"
          :ref="(element) => setVLayerCellRef(element as any as VLayerCellInstance, pPanel.id)"
          :petaPanel="pPanel"
          :selected="pPanel._selected"
          :sorting="draggingData !== undefined"
          @startDrag="pointerdown"
          @onClick="clickLayer"
          @update:petaPanel="updatePetaPanel"
          :style="{
            order: orders[pPanel.id] ?? props.pPanelsArray.length,
          }"
        />
      </t-layers>
      <t-drag-target-line ref="dragTargetLineElement" v-if="draggingData"></t-drag-target-line>
      <t-drag-floating-tag-cell v-if="draggingData !== undefined" ref="floatingCellElement">
        <VLayerCell ref="cellDrag" :petaPanel="draggingData" :drag="true" />
      </t-drag-floating-tag-cell>
    </t-layers-parent>
  </t-layer-root>
</template>

<script setup lang="ts">
// Vue
import { onBeforeUpdate, ref, watch } from "vue";
// Components
import VLayerCell from "@/rendererProcess/components/layer/VLayerCell.vue";
// Others
import { Keyboards } from "@/rendererProcess/utils/keyboards";
import { Vec2, vec2FromPointerEvent } from "@/commons/utils/vec2";
import { PetaPanel } from "@/commons/datas/petaPanel";
import { useStateStore } from "@/rendererProcess/stores/statesStore";
import {
  initSortHelper,
  SortHelperConstraint,
} from "@/rendererProcess/components/browser/tags/sortHelper";
import { MouseButton } from "@/commons/datas/mouseButton";
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
const vLayerCells = ref<{ [key: string]: VLayerCellInstance }>({});
onBeforeUpdate(() => {
  vLayerCells.value = {};
});
function setVLayerCellRef(element: VLayerCellInstance, id: string) {
  vLayerCells.value[id] = element;
}
//--------------------------------------------------------------------//
// ドラッグここから
//--------------------------------------------------------------------//
const draggingData = ref<PetaPanel>();
const floatingCellElement = ref<HTMLElement>();
const dragTargetLineElement = ref<HTMLElement>();
const orders = ref<{ [key: string]: number }>({});
const constraints = ref<{
  [key: string]: SortHelperConstraint;
}>({});
const { pointerdown } = initSortHelper<PetaPanel>(
  {
    getElementFromId: (id) => vLayerCells.value[id]?.$el as HTMLElement,
    onChangeDraggingData: (data) => (draggingData.value = data),
    getIsDraggableFromId: () => true,
    onSort: () => {
      const updatedPetaPanels: PetaPanel[] = [];
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
    dragTargetLineElement,
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
function clickLayer(event: PointerEvent, petaPanel: PetaPanel) {
  if (event.button === MouseButton.LEFT) {
    clearSelectionAll();
    petaPanel._selected = true;
  } else if (event.button === MouseButton.RIGHT) {
    if (!petaPanel._selected) {
      clearSelectionAll();
    }
    petaPanel._selected = true;
    emit("petaPanelMenu", petaPanel, vec2FromPointerEvent(event));
  }
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
function updatePetaPanel(petaPanel: PetaPanel) {
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
t-layer-root {
  background-color: var(--color-0);
  border-radius: var(--rounded);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  position: fixed;
  right: 0px;
  bottom: 0px;
  box-shadow: 1px 1px 5px rgba(0, 0, 0, 0.5);
  margin: var(--px-2);
  padding: var(--px-2);
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
    margin-bottom: var(--px-2);
    filter: var(--filter-icon);
  }
  > t-layers-parent {
    display: block;
    overflow-x: hidden;
    overflow-y: auto;
    height: 100%;
    flex: 1;
    > t-layers {
      display: flex;
      flex-direction: column;
      margin: 0px;
      padding: 0px;
      position: relative;
      overflow-anchor: none;
    }
    > t-drag-target-line {
      position: fixed;
      z-index: 999;
      width: 0px;
      height: 0px;
      top: 0px;
      left: 0px;
      transform-origin: top left;
      &::after {
        content: "";
        display: block;
        width: 100%;
        height: 100%;
        border-radius: 99px;
        background-color: var(--color-accent);
        transform: translate(-50%, -50%);
      }
    }
    > t-drag-floating-tag-cell {
      z-index: 999;
      pointer-events: none;
      top: 0px;
      left: 0px;
      position: fixed;
      visibility: hidden;
      opacity: 0.9;
      transform-origin: top right;
    }
  }
}
</style>
