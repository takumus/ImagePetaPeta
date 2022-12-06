<template>
  <t-board-root
    ref="boardRoot"
    v-show="currentBoard"
    :style="{
      zIndex: zIndex,
    }">
    <t-pixi-container
      ><VPIXI
        ref="vPixi"
        @construct="construct"
        @destruct="destruct"
        @tick="animate"
        @lose-context="loseContext"
        @resize="resize"
    /></t-pixi-container>
    <t-crop v-if="cropping">
      <VCrop :peta-panel="croppingPetaPanel" @update="updateCrop" />
    </t-crop>
    <VBoardLoading :z-index="2" :data="boardLoader.loadingStatus.value"></VBoardLoading>
    <VLayer
      ref="layer"
      :z-index="1"
      :visible="true"
      :p-panels-array="petaPanelsArray"
      @sort-index="boardLoader.sortIndex"
      @peta-panel-menu="petaPanelMenu"
      @order-render="orderPIXIRender"
      @update:peta-panels="boardLoader.updatePetaPanelsFromLayer" />
    <VPetaPanelProperty
      :selected-peta-panels="selectedPetaPanelsArray"
      :peta-panels="petaPanelsArray"
      :board-loader="boardLoader"
      @update:peta-panels="boardLoader.updatePetaPanelsFromLayer"
      @sort-index="boardLoader.sortIndex"
      @remove-selected-panels="boardLoader.removeSelectedPanels"
      :z-index="3"
      ref="petaPanelsProperty" />
  </t-board-root>
</template>

<script setup lang="ts">
import * as PIXI from "pixi.js";
import { computed, onMounted, onUnmounted, ref, toRaw, watch } from "vue";
import { useI18n } from "vue-i18n";

import VCrop from "@/renderer/components/board/VCrop.vue";
import VPetaPanelProperty from "@/renderer/components/board/VPetaPanelProperty.vue";
import VLayer from "@/renderer/components/board/layer/VLayer.vue";
import VBoardLoading from "@/renderer/components/board/loading/VBoardLoading.vue";
import VPIXI from "@/renderer/components/commons/utils/pixi/VPIXI.vue";

import { MouseButton } from "@/commons/datas/mouseButton";
import { RPetaBoard } from "@/commons/datas/rPetaBoard";
import { RPetaPanel } from "@/commons/datas/rPetaPanel";
import { WindowType } from "@/commons/datas/windowType";
import { BOARD_ZOOM_MAX, BOARD_ZOOM_MIN } from "@/commons/defines";
import { Vec2, vec2FromPointerEvent } from "@/commons/utils/vec2";

import { PSelection } from "@/renderer/components/board/PSelection";
import { initBoardLoader } from "@/renderer/components/board/boardLoader";
import { PBackground } from "@/renderer/components/board/pBackground";
import { PBoardGrid } from "@/renderer/components/board/pGrid";
import { PPetaPanel } from "@/renderer/components/board/pPetaPanels/pPetaPanel";
import { PTransformer } from "@/renderer/components/board/pPetaPanels/pTransformer";
import { PIXIRect } from "@/renderer/components/commons/utils/pixi/rect";
import { ClickChecker } from "@/renderer/libs/clickChecker";
import { IPC } from "@/renderer/libs/ipc";
import { Keyboards } from "@/renderer/libs/keyboards";
import { logChunk } from "@/renderer/libs/rendererLogger";
import { useComponentsStore } from "@/renderer/stores/componentsStore/useComponentsStore";
import { useKeyboardsStore } from "@/renderer/stores/keyboardsStore/useKeyboardsStore";
import { useNSFWStore } from "@/renderer/stores/nsfwStore/useNSFWStore";
import { usePetaFilesStore } from "@/renderer/stores/petaFilesStore/usePetaFilesStore";
import { useSettingsStore } from "@/renderer/stores/settingsStore/useSettingsStore";
import { useSystemInfoStore } from "@/renderer/stores/systemInfoStore/useSystemInfoStore";
import { hitTest } from "@/renderer/utils/hitTest";

const emit = defineEmits<{
  (e: "update:board", board: RPetaBoard): void;
}>();
const props = defineProps<{
  board?: RPetaBoard;
  zIndex: number;
}>();
const { systemInfo } = useSystemInfoStore();
const nsfwStore = useNSFWStore();
const settingsStore = useSettingsStore();
const components = useComponentsStore();
const petaFilesStore = usePetaFilesStore();
const keyboards = useKeyboardsStore(true);
const { t } = useI18n();
const layer = ref<typeof VLayer>();
const croppingPetaPanel = ref<RPetaPanel>();
const cropping = ref(false);
const dragging = ref(false);
const petaPanelsProperty = ref<InstanceType<typeof VPetaPanelProperty>>();
const currentBoard = ref<RPetaBoard>();
const vPixi = ref<InstanceType<typeof VPIXI>>();
const dragOffset = new Vec2();
const click = new ClickChecker();
const rootContainer = new PIXI.Container();
const centerWrapper = new PIXI.Container();
const pPanelsContainer = new PIXI.Container();
const pBackground = new PBackground();
const pSelection = new PSelection();
const pBoardGrid = new PBoardGrid();
const stageRect = new Vec2();
const mousePosition = new Vec2();
const pTransformer = new PTransformer({});
const mouseOffset = new Vec2();
let mouseLeftPressing = false;
let mouseRightPressing = false;
let selecting = false;
const boardLoader = initBoardLoader(
  pPanelsContainer,
  pTransformer,
  currentBoard,
  onUpdateGif,
  orderPIXIRender,
  updatePetaBoard,
);
onMounted(() => {
  pTransformer.updatePetaPanels = updatePetaBoard;
  keyboards.enabled = true;
  keyboards.keys("Delete").down(boardLoader.removeSelectedPanels);
  keyboards.keys("Backspace").down(boardLoader.removeSelectedPanels);
  keyboards.keys("ShiftLeft", "ShiftRight").change((pressed) => {
    pTransformer.fit = pressed;
  });
  vPixi.value?.canvasWrapper().addEventListener("dblclick", boardLoader.resetTransform);
  vPixi.value?.canvasWrapper().addEventListener("pointerdown", preventWheelClick);
  vPixi.value?.canvasWrapper().addEventListener("mousewheel", wheel as (e: Event) => void);
});
onUnmounted(() => {
  vPixi.value?.canvasWrapper().removeEventListener("dblclick", boardLoader.resetTransform);
  vPixi.value?.canvasWrapper().removeEventListener("pointerdown", preventWheelClick);
  vPixi.value?.canvasWrapper().removeEventListener("mousewheel", wheel as (e: Event) => void);
});
function construct() {
  logChunk().log("construct PIXI");
  const pixiApp = vPixi.value?.app();
  if (pixiApp === undefined) {
    return;
  }
  pixiApp.stage.on("pointerdown", pointerdown);
  pixiApp.stage.on("pointerup", pointerup);
  pixiApp.stage.on("pointerupoutside", pointerup);
  pixiApp.stage.on("pointermove", pointermove);
  // pixi.stage.on("pointermoveoutside", pointermove);
  pixiApp.stage.on("pointerup", pTransformer.pointerup.bind(pTransformer));
  pixiApp.stage.on("pointerupoutside", pTransformer.pointerup.bind(pTransformer));
  pixiApp.stage.on("pointermove", pTransformer.pointermove.bind(pTransformer));
  // pixi.stage.on("pointermoveoutside", pTransformer.pointermove.bind(pTransformer));
  pixiApp.stage.addChild(pBackground, pBoardGrid, centerWrapper);
  centerWrapper.addChild(rootContainer);
  rootContainer.addChild(pPanelsContainer, pTransformer, pSelection);
  pixiApp.stage.interactive = true;
}
function destruct() {
  //
}
function loseContext() {
  logChunk().error("WEBGL_lose_context");
  IPC.send("reloadWindow");
}
function resize(rect: PIXIRect) {
  stageRect.set(rect.domRect.width, rect.domRect.height);
  mouseOffset.set(vPixi.value?.canvasWrapper().getBoundingClientRect());
  stageRect.clone().div(2).setTo(centerWrapper);
  updateRect();
}
function preventWheelClick(event: PointerEvent) {
  if (event.button === MouseButton.MIDDLE) {
    event.preventDefault();
  }
}
function pointerdown(e: PIXI.FederatedPointerEvent) {
  if (!currentBoard.value) {
    return;
  }
  const mouse = new Vec2(e.global);
  click.down();
  if (e.button === MouseButton.RIGHT || e.button === MouseButton.MIDDLE) {
    mouseRightPressing = true;
    dragging.value = true;
    dragOffset.set(currentBoard.value.transform.position).sub(mouse);
  } else if (e.button === MouseButton.LEFT) {
    mouseLeftPressing = true;
    const pPanel = boardLoader.getPPetaPanelFromObject(e.target);
    if (pPanel) {
      pointerdownPPetaPanel(pPanel, e);
    } else if (e.target instanceof PIXI.Container && e.target.name != "transformer") {
      boardLoader.clearSelectionAll();
      selecting = true;
      pSelection.topLeft.set(rootContainer.toLocal(mouse));
      pSelection.bottomRight.set(pSelection.topLeft);
    }
  }
  orderPIXIRender();
}
function pointerup(e: PIXI.FederatedPointerEvent) {
  const mouse = new Vec2(e.global).add(mouseOffset);
  if (e.button === MouseButton.RIGHT || e.button === MouseButton.MIDDLE) {
    mouseRightPressing = false;
    if (click.isClick && e.button === MouseButton.RIGHT) {
      const pPanel = boardLoader.getPPetaPanelFromObject(e.target);
      if (pPanel) {
        pointerdownPPetaPanel(pPanel, e);
        petaPanelMenu(pPanel.petaPanel, new Vec2(mouse));
      } else {
        components.contextMenu.open(
          [
            {
              label: t("boards.menu.openBrowser"),
              click: () => IPC.send("openWindow", WindowType.BROWSER),
            },
            { separate: true },
            { label: t("boards.menu.resetPosition"), click: boardLoader.resetTransform },
          ],
          new Vec2(mouse),
        );
      }
    }
    dragging.value = false;
    if (!click.isClick) {
      updatePetaBoard();
    }
  } else if (e.button === MouseButton.LEFT) {
    mouseLeftPressing = false;
    selecting = false;
  }
  orderPIXIRender();
}
function pointermove(e: PIXI.FederatedPointerEvent) {
  const mouse = new Vec2(e.global);
  mousePosition.set(mouse);
  if (mouseLeftPressing || mouseRightPressing) {
    orderPIXIRender();
  }
}
function wheel(event: WheelEvent) {
  if (!currentBoard.value) {
    return;
  }
  const mouse = vec2FromPointerEvent(event).sub(mouseOffset).sub(stageRect.clone().div(2));
  if (event.ctrlKey || systemInfo.value.platform === "win32") {
    const currentZoom = currentBoard.value.transform.scale;
    currentBoard.value.transform.scale *=
      1 + -event.deltaY * settingsStore.state.value.zoomSensitivity * 0.00001;
    if (currentBoard.value.transform.scale > BOARD_ZOOM_MAX) {
      currentBoard.value.transform.scale = BOARD_ZOOM_MAX;
    } else if (currentBoard.value.transform.scale < BOARD_ZOOM_MIN) {
      currentBoard.value.transform.scale = BOARD_ZOOM_MIN;
    }
    currentBoard.value.transform.position
      .mult(-1)
      .add(mouse)
      .mult(currentBoard.value.transform.scale / currentZoom)
      .sub(mouse)
      .mult(-1);
  } else {
    currentBoard.value.transform.position.add(
      new Vec2(event.deltaX, event.deltaY)
        .mult(settingsStore.state.value.moveSensitivity)
        .mult(-0.01),
    );
  }
  updatePetaBoard();
  orderPIXIRender();
}
function updateRect() {
  if (!currentBoard.value) {
    return;
  }
  pBackground.renderRect(
    stageRect.x,
    stageRect.y,
    Number(currentBoard.value.background.fillColor.replace("#", "0x")),
  );
}
function animate() {
  if (!currentBoard.value) {
    return;
  }
  const boardScale = currentBoard.value.transform.scale;
  rootContainer.scale.set(boardScale);
  boardLoader.pPanelsArray().forEach((pp) => pp.setZoomScale(boardScale));
  pTransformer.setScale(1 / boardScale);
  pTransformer.update();

  if (dragging.value) {
    currentBoard.value.transform.position.set(mousePosition).add(dragOffset);
  }
  currentBoard.value.transform.position.setTo(rootContainer);
  pBoardGrid.setScale(boardScale);
  pBoardGrid.update(
    stageRect.x,
    stageRect.y,
    currentBoard.value.transform.position,
    currentBoard.value.background.lineColor,
  );
  pSelection.clear();
  if (selecting) {
    pSelection.bottomRight.set(rootContainer.toLocal(mousePosition));
    pSelection.draw(boardScale);
    boardLoader.pPanelsArray().forEach((pPanel) => {
      const pPanelRect = pPanel.getRect();
      Object.values(pPanelRect).map((position) => {
        position.set(rootContainer.toLocal(pPanel.toGlobal(position)));
      });
      const newSelected =
        hitTest(pSelection.rect, pPanelRect) &&
        pPanel.petaPanel.visible &&
        !pPanel.petaPanel.locked;
      if (pPanel.petaPanel.renderer.selected !== newSelected) {
        pPanel.petaPanel.renderer.selected = newSelected;
      }
    });
  }
  boardLoader.pPanelsArray().forEach((pp) => (pp.unselected = false));
  if (boardLoader.selectedPPetaPanels().length > 0) {
    boardLoader.unselectedPPetaPanels().forEach((pp) => (pp.unselected = true));
  }
  boardLoader.pPanelsArray().forEach((pPanel) => pPanel.orderRender());
}
function petaPanelMenu(petaPanel: RPetaPanel, position: Vec2) {
  const pPanel = boardLoader.getPPanelFromId(petaPanel.id);
  if (!pPanel) {
    return;
  }
  petaPanelsProperty.value?.open(position);
}
// function beginCrop(petaPanel: RPetaPanel) {
//   croppingPetaPanel.value = petaPanel;
//   cropping.value = true;
//   if (keyboards) {
//     keyboards.enabled = false;
//   }
// }
// function endCrop() {
//   croppingPetaPanel.value = undefined;
//   cropping.value = false;
//   if (keyboards) {
//     keyboards.enabled = true;
//   }
// }
function updateCrop(petaPanel?: RPetaPanel) {
  // endCrop();
  const petaFile = petaFilesStore.getPetaFile(petaPanel?.petaFileId);
  if (petaFile === undefined || currentBoard.value === undefined || petaPanel === undefined) {
    return;
  }
  const sign = petaPanel.height < 0 ? -1 : 1;
  petaPanel.height =
    Math.abs(
      petaPanel.width *
        ((petaPanel.crop.height * petaFile.metadata.height) /
          (petaPanel.crop.width * petaFile.metadata.width)),
    ) * sign;
  currentBoard.value.petaPanels[petaPanel.id] = petaPanel;
  boardLoader.load({
    reload: {
      additions: [],
      deletions: [],
    },
  });
  updatePetaBoard();
  orderPIXIRender();
}
function onUpdateGif() {
  if (boardLoader.loadingStatus.value.extracting) {
    return;
  }
  orderPIXIRender();
}
function pointerdownPPetaPanel(pPanel: PPetaPanel, e: PIXI.FederatedPointerEvent) {
  if (!currentBoard.value) {
    return;
  }
  if (
    !Keyboards.pressedOR("ShiftLeft", "ShiftRight") &&
    (boardLoader.selectedPPetaPanels().length <= 1 || !pPanel.petaPanel.renderer.selected)
  ) {
    // シフトなし。かつ、(１つ以下の選択か、自身が未選択の場合)
    // 最前にして選択リセット
    boardLoader.clearSelectionAll();
  }
  if (boardLoader.selectedPPetaPanels().length <= 1) {
    // 選択が１つ以下の場合選択範囲リセット
    boardLoader.clearSelectionAll();
  }
  pPanel.petaPanel.renderer.selected = true;
  layer.value?.scrollTo(pPanel.petaPanel);
  pTransformer.pointerdownPPetaPanel(pPanel, e);
}
function updatePetaBoard() {
  if (currentBoard.value) {
    emit("update:board", currentBoard.value);
  }
}
function orderPIXIRender() {
  vPixi.value?.orderPIXIRender();
}
const selectedPetaPanelsArray = computed(() =>
  petaPanelsArray.value.filter((p) => p.renderer.selected),
);
const petaPanelsArray = computed(() => {
  if (!currentBoard.value) {
    return [];
  }
  return Object.values(currentBoard.value?.petaPanels);
});
watch(nsfwStore.state, () => {
  boardLoader.pPanelsArray().forEach((pp) => (pp.showNSFW = nsfwStore.state.value));
  orderPIXIRender();
});
// ボードの変更をウォッチ
watch(
  () => props.board,
  () => {
    // 現在のボードと同じか確認
    const same = props.board && currentBoard.value?.id === props.board?.id;
    // 新しいのにする
    currentBoard.value = toRaw(props.board);
    // 背景色なども変わってるかもしれないので背景再描画
    updateRect();
    // レンダリング予約
    orderPIXIRender();
    if (!same) {
      // 違ったらフルロード
      boardLoader.load({});
    } else {
      // 同じならデータの参照のみ更新
      boardLoader.load({
        reload: {
          additions: [],
          deletions: [],
        },
      });
    }
  },
);
defineExpose({
  load: boardLoader.load,
  addPanel: (petaPanel: RPetaPanel, offsetIndex: number) => {
    boardLoader.addPanel(petaPanel, offsetIndex, mouseOffset);
  },
  orderPIXIRender,
  clearSelectionAll: boardLoader.clearSelectionAll,
});
</script>

<style lang="scss" scoped>
t-board-root {
  position: relative;
  width: 100%;
  height: 100%;
  display: block;
  > t-pixi-container {
    position: absolute;
    top: 0px;
    left: 0px;
    width: 100%;
    height: 100%;
    z-index: 1;
    display: block;
  }
  > t-crop {
    position: absolute;
    z-index: 3;
    top: 0px;
    left: 0px;
    width: 100%;
    height: 100%;
    display: block;
  }
}
</style>
