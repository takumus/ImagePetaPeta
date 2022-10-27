<template>
  <t-board-root
    ref="boardRoot"
    v-show="currentBoard"
    :style="{
      zIndex: zIndex,
    }"
  >
    <t-pixi-container ref="panelsBackground" class="panels-wrapper"> </t-pixi-container>
    <t-crop v-if="cropping">
      <VCrop :petaPanel="croppingPetaPanel" @update="updateCrop" />
    </t-crop>
    <VBoardLoading
      :zIndex="2"
      :loading="extracting || loading"
      :log="extractingLog"
      :extractProgress="extractProgress"
      :loadProgress="loadProgress"
    ></VBoardLoading>
    <VLayer
      ref="layer"
      :zIndex="1"
      :visible="true"
      :pPanelsArray="petaPanelsArray"
      @sortIndex="sortIndex"
      @petaPanelMenu="petaPanelMenu"
      @update="orderPIXIRender"
      @update:petaPanels="updatePetaPanelsFromLayer"
    />
  </t-board-root>
</template>

<script setup lang="ts">
// Vue
import { ref, onMounted, onUnmounted, watch, toRaw, computed } from "vue";
// Components
import VCrop from "@/rendererProcess/components/board/VCrop.vue";
import VBoardLoading from "@/rendererProcess/components/board/VBoardLoading.vue";
import VLayer from "@/rendererProcess/components/layer/VLayer.vue";
// Others
import { PBoardGrid } from "@/rendererProcess/components/board/pGrid";
import { Vec2, vec2FromPointerEvent } from "@/commons/utils/vec2";
import { PetaBoard } from "@/commons/datas/petaBoard";
import { PetaPanel } from "@/commons/datas/petaPanel";
import { MouseButton } from "@/commons/datas/mouseButton";
import { ClickChecker } from "@/rendererProcess/utils/clickChecker";
import * as PIXI from "pixi.js";
import { PPanel } from "@/rendererProcess/components/board/ppanels/PPanel";
import { PTransformer } from "@/rendererProcess/components/board/ppanels/pTransformer";
import { hitTest } from "@/rendererProcess/utils/hitTest";
import { BOARD_ZOOM_MAX, BOARD_ZOOM_MIN } from "@/commons/defines";
import { minimId } from "@/commons/utils/utils";
import { Keyboards } from "@/rendererProcess/utils/keyboards";
import * as Cursor from "@/rendererProcess/utils/cursor";
import { logChunk } from "@/rendererProcess/utils/rendererLogger";
import { Rectangle } from "pixi.js";
import { API } from "@/rendererProcess/api";
import { WindowType } from "@/commons/datas/windowType";
import { useNSFWStore } from "@/rendererProcess/stores/nsfwStore";
import { PSelection } from "@/rendererProcess/components/board/PSelection";
import { useKeyboardsStore } from "@/rendererProcess/stores/keyboardsStore";
import { isKeyboardLocked } from "@/rendererProcess/utils/isKeyboardLocked";
import { useSystemInfoStore } from "@/rendererProcess/stores/systemInfoStore";
import { useStateStore } from "@/rendererProcess/stores/statesStore";
import { useSettingsStore } from "@/rendererProcess/stores/settingsStore";
import { useI18n } from "vue-i18n";
import { useComponentsStore } from "@/rendererProcess/stores/componentsStore";
import { usePetaImagesStore } from "@/rendererProcess/stores/petaImagesStore";
import { useResizerStore } from "@/rendererProcess/stores/resizerStore";
import { PetaImage } from "@/commons/datas/petaImage";
import { ppa } from "@/commons/utils/pp";
const emit = defineEmits<{
  (e: "update:board", board: PetaBoard): void;
}>();
const props = defineProps<{
  board?: PetaBoard;
  zIndex: number;
}>();
const { systemInfo } = useSystemInfoStore();
const nsfwStore = useNSFWStore();
const statesStore = useStateStore();
const settingsStore = useSettingsStore();
const components = useComponentsStore();
const petaImagesStore = usePetaImagesStore();
const resizerStore = useResizerStore();
const { t } = useI18n();
/* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */
const panelsBackground = ref<HTMLElement>();
const layer = ref<typeof VLayer>();
const extracting = ref(false);
const loading = ref(false);
const extractingLog = ref("");
const extractProgress = ref(0);
const loadProgress = ref(0);
const croppingPetaPanel = ref<PetaPanel>();
const cropping = ref(false);
const dragging = ref(false);
const dragged = ref(false);

const dragOffset = new Vec2();
const click = new ClickChecker();
const rootContainer = new PIXI.Container();
const centerWrapper = new PIXI.Container();
const panelsCenterWrapper = new PIXI.Container();
const backgroundSprite = new PIXI.Graphics();
const pSelection = new PSelection();
const grid = new PBoardGrid();
const stageRect = new Vec2();
const mousePosition = new Vec2();
let pPanels: { [key: string]: PPanel } = {};
const pTransformer = new PTransformer(pPanels);
const mouseOffset = new Vec2();
// let draggingPanels = false;
let pixi: PIXI.Application | undefined;
let mouseLeftPressing = false;
let mouseRightPressing = false;
let renderOrdered = false;
let selecting = false;
let requestAnimationFrameHandle = 0;
const keyboards = useKeyboardsStore(true);
let cancelExtract: (() => Promise<void>) | undefined;
let resolution = -1;
let changeResolutionIntervalHandler = -1;
const currentBoard = ref<PetaBoard>();
onMounted(() => {
  constructIfResolutionChanged();
  pTransformer.updatePetaPanels = updatePetaPanels;
  keyboards.enabled = true;
  keyboards.keys("Delete").down(removeSelectedPanels);
  keyboards.keys("Backspace").down(removeSelectedPanels);
  keyboards.keys("ShiftLeft", "ShiftRight").change(keyShift);
  changeResolutionIntervalHandler = window.setInterval(constructIfResolutionChanged, 1000);
});
onUnmounted(() => {
  destruct();
  window.clearInterval(changeResolutionIntervalHandler);
});
function constructIfResolutionChanged() {
  if (resolution != window.devicePixelRatio) {
    resolution = window.devicePixelRatio;
    destruct();
    construct(resolution);
  }
}
function construct(resolution?: number) {
  logChunk().log("construct PIXI");
  PIXI.settings.MIPMAP_TEXTURES = PIXI.MIPMAP_MODES.OFF;
  pixi = new PIXI.Application({
    resolution,
    antialias: true,
    backgroundAlpha: 0,
  });
  pixi.view.addEventListener("dblclick", resetTransform);
  pixi.view.addEventListener("mousewheel", wheel as (e: Event) => void);
  pixi.view.addEventListener("pointerdown", preventWheelClick);
  pixi.stage.on("pointerdown", pointerdown);
  pixi.stage.on("pointerup", pointerup);
  pixi.stage.on("pointerupoutside", pointerup);
  pixi.stage.on("pointermove", pointermove);
  pixi.stage.on("pointermoveoutside", pointermove);
  pixi.stage.on("pointerup", pTransformer.pointerup.bind(pTransformer));
  pixi.stage.on("pointerupoutside", pTransformer.pointerup.bind(pTransformer));
  pixi.stage.on("pointermove", pTransformer.pointermove.bind(pTransformer));
  pixi.stage.on("pointermoveoutside", pTransformer.pointermove.bind(pTransformer));
  pixi.stage.addChild(backgroundSprite);
  // pixi.stage.addChild(crossLine);
  pixi.stage.addChild(grid);
  pixi.stage.addChild(centerWrapper);
  centerWrapper.addChild(rootContainer);
  rootContainer.addChild(panelsCenterWrapper);
  rootContainer.addChild(pTransformer);
  rootContainer.addChild(pSelection);
  panelsBackground.value?.appendChild(pixi.view);
  pixi.stage.interactive = true;
  pixi.ticker.stop();
  resizerStore.on("resize", resize);
  resizerStore.observe(panelsBackground.value);
  renderPIXI();
  PIXI.Ticker.shared.add(updateAnimatedGIF);
}
function destruct() {
  if (pixi) {
    logChunk().log("destruct PIXI");
    pixi.destroy(true);
  }
  PIXI.Ticker.shared.remove(updateAnimatedGIF);
  cancelAnimationFrame(requestAnimationFrameHandle);
}
function resize(rect: DOMRectReadOnly) {
  stageRect.x = rect.width;
  stageRect.y = rect.height;
  mouseOffset.set(panelsBackground.value?.getBoundingClientRect());
  if (pixi) {
    pixi.renderer.resize(rect.width, rect.height);
    pixi.view.style.width = rect.width + "px";
    pixi.view.style.height = rect.height + "px";
  }
  centerWrapper.x = rect.width / 2;
  centerWrapper.y = rect.height / 2;
  updateRect();
  orderPIXIRender();
  renderPIXI();
}
function preventWheelClick(event: PointerEvent) {
  if (event.button === MouseButton.MIDDLE) {
    event.preventDefault();
  }
}
function pointerdown(e: PIXI.InteractionEvent) {
  if (!currentBoard.value) {
    return;
  }
  const mouse = getMouseFromEvent(e);
  click.down(mouse);
  if (e.data.button === MouseButton.RIGHT || e.data.button === MouseButton.MIDDLE) {
    mouseRightPressing = true;
    dragging.value = true;
    dragged.value = false;
    dragOffset.set(currentBoard.value.transform.position).sub(mouse);
  } else if (e.data.button === MouseButton.LEFT) {
    mouseLeftPressing = true;
    const pPanel = getPPanelFromObject(e.target);
    if (pPanel) {
      pointerdownPPanel(pPanel, e);
    } else if (e.target.name != "transformer") {
      clearSelectionAll();
      selecting = true;
      pSelection.topLeft.set(rootContainer.toLocal(mouse));
      pSelection.bottomRight.set(pSelection.topLeft);
    }
  }
  orderPIXIRender();
}
function getPPanelFromObject(object: PIXI.DisplayObject) {
  if (currentBoard.value?.petaPanels[(object as PPanel).petaPanel?.id]) {
    return object as PPanel;
  }
  return undefined;
}
function pointerup(e: PIXI.InteractionEvent) {
  const mouse = getMouseFromEvent(e).add(mouseOffset);
  if (e.data.button === MouseButton.RIGHT || e.data.button === MouseButton.MIDDLE) {
    mouseRightPressing = false;
    if (click.isClick && e.data.button === MouseButton.RIGHT) {
      const pPanel = getPPanelFromObject(e.target);
      if (pPanel) {
        pointerdownPPanel(pPanel, e);
        petaPanelMenu(pPanel.petaPanel, new Vec2(mouse));
      } else {
        components.contextMenu.open(
          [
            {
              label: t("boards.menu.openBrowser"),
              click: () => API.send("openWindow", WindowType.BROWSER),
            },
            { separate: true },
            { label: t("boards.menu.resetPosition"), click: resetTransform },
          ],
          new Vec2(mouse),
        );
      }
    }
    dragging.value = false;
    if (!click.isClick) {
      updatePetaBoard();
    }
  } else if (e.data.button === MouseButton.LEFT) {
    mouseLeftPressing = false;
    selecting = false;
  }
  orderPIXIRender();
}
function pointermove(e: PIXI.InteractionEvent) {
  const mouse = getMouseFromEvent(e);
  mousePosition.set(mouse);
  click.move(mousePosition);
  if (mouseLeftPressing || mouseRightPressing) {
    orderPIXIRender();
  }
}
function getMouseFromEvent(e: PIXI.InteractionEvent) {
  return new Vec2(e.data.global);
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
  backgroundSprite.clear();
  backgroundSprite.hitArea = new Rectangle(0, 0, stageRect.x, stageRect.y);
  backgroundSprite.beginFill(Number(currentBoard.value.background.fillColor.replace("#", "0x")));
  backgroundSprite.drawRect(0, 0, stageRect.x, stageRect.y);
}
function animate() {
  if (!currentBoard.value) {
    return;
  }
  const boardScale = currentBoard.value.transform.scale;
  rootContainer.scale.set(boardScale);
  pPanelsArray().forEach((pp) => pp.setZoomScale(boardScale));
  pTransformer.setScale(1 / boardScale);
  pTransformer.update();

  if (dragging.value) {
    const prev = currentBoard.value.transform.position.clone();
    currentBoard.value.transform.position.set(mousePosition).add(dragOffset);
    if (!prev.equals(currentBoard.value.transform.position)) {
      dragged.value = true;
    }
  }
  currentBoard.value.transform.position.setTo(rootContainer);
  grid.setScale(boardScale);
  grid.update(
    stageRect.x,
    stageRect.y,
    currentBoard.value.transform.position,
    currentBoard.value.background.lineColor,
  );
  pSelection.clear();
  if (selecting) {
    pSelection.bottomRight.set(rootContainer.toLocal(mousePosition));
    pSelection.draw(boardScale);
    pPanelsArray().forEach((pPanel) => {
      const pPanelRect = pPanel.getRect();
      Object.values(pPanelRect).map((position) => {
        position.set(rootContainer.toLocal(pPanel.toGlobal(position)));
      });
      pPanel.petaPanel._selected =
        hitTest(pSelection.rect, pPanelRect) &&
        pPanel.petaPanel.visible &&
        !pPanel.petaPanel.locked;
    });
  }
  pPanelsArray().forEach((pp) => (pp.unselected = false));
  if (selectedPPanels().length > 0) {
    unselectedPPanels().forEach((pp) => (pp.unselected = true));
  }
  pPanelsArray().forEach((pPanel) => pPanel.orderRender());
}
function resetTransform() {
  if (!currentBoard.value) {
    return;
  }
  currentBoard.value.transform.scale = 1;
  currentBoard.value.transform.position.set(0, 0);
  orderPIXIRender();
  updatePetaBoard();
}
function removeSelectedPanels() {
  if (!currentBoard.value) {
    return;
  }
  if (isKeyboardLocked()) {
    return;
  }
  selectedPPanels().forEach((pPanel) => {
    removePPanel(pPanel);
    if (currentBoard.value) {
      delete currentBoard.value.petaPanels[pPanel.petaPanel.id];
    }
  });
  orderPIXIRender();
  updatePetaBoard();
}
function removePPanel(pPanel: PPanel) {
  panelsCenterWrapper.removeChild(pPanel);
  pPanel.destroy();
  delete pPanels[pPanel.petaPanel.id];
}
function petaPanelMenu(petaPanel: PetaPanel, position: Vec2) {
  const pPanel = pPanels[petaPanel.id];
  if (!pPanel) {
    return;
  }
  const petaImage = petaImagesStore.getPetaImage(petaPanel.petaImageId);
  const isMultiple = selectedPPanels().length > 1;
  components.contextMenu.open(
    [
      { label: t("boards.panelMenu.toFront"), click: () => changeOrder("front") },
      { label: t("boards.panelMenu.toBack"), click: () => changeOrder("back") },
      { separate: true },
      { label: t("boards.panelMenu.details"), click: () => openDetails(petaImage) },
      { separate: true },
      {
        skip: isMultiple || !pPanel.isGIF,
        label: pPanel.isPlayingGIF ? t("boards.panelMenu.stopGIF") : t("boards.panelMenu.playGIF"),
        click: () => {
          pPanel.toggleGIF();
          updatePetaBoard();
        },
      },
      { skip: isMultiple || !pPanel?.isGIF, separate: true },
      {
        skip: isMultiple,
        label: t("boards.panelMenu.crop"),
        click: () => {
          beginCrop(petaPanel);
        },
      },
      { skip: isMultiple, separate: true },
      { label: t("boards.panelMenu.flipHorizontal"), click: () => flipPetaPanel("horizontal") },
      { label: t("boards.panelMenu.flipVertical"), click: () => flipPetaPanel("vertical") },
      { separate: true },
      { label: t("boards.panelMenu.reset"), click: resetPetaPanel },
      { separate: true },
      { label: t("boards.panelMenu.remove"), click: removeSelectedPanels },
    ],
    position,
  );
}
function changeOrder(to: "front" | "back") {
  selectedPPanels().forEach(
    (pPanel) => (pPanel.petaPanel.index += pPanelsArray().length * (to === "front" ? 1 : -1)),
  );
  sortIndex();
}
function openDetails(petaImage?: PetaImage) {
  if (petaImage === undefined) {
    return;
  }
  API.send("setDetailsPetaImage", petaImage);
  API.send("openWindow", WindowType.DETAILS);
}
function resetPetaPanel() {
  selectedPPanels().forEach((pPanel) => {
    pPanel.petaPanel.height = Math.abs(pPanel.petaPanel.height);
    pPanel.petaPanel.width = Math.abs(pPanel.petaPanel.width);
    pPanel.petaPanel.crop.position.set(0, 0);
    pPanel.petaPanel.crop.width = 1;
    pPanel.petaPanel.crop.height = 1;
    pPanel.petaPanel.rotation = 0;
    updateCrop(pPanel.petaPanel);
  });
}
function flipPetaPanel(direction: "vertical" | "horizontal") {
  selectedPPanels().forEach((pPanel) => {
    if (direction === "vertical") {
      pPanel.petaPanel.height = -pPanel.petaPanel.height;
    } else {
      pPanel.petaPanel.width = -pPanel.petaPanel.width;
    }
  });
  updatePetaBoard();
}
async function addPanel(petaPanel: PetaPanel, offsetIndex: number) {
  if (!currentBoard.value) {
    return;
  }
  endCrop();
  if (offsetIndex === 0) {
    clearSelectionAll();
  }
  const offset = new Vec2(20, 20).mult(offsetIndex);
  petaPanel.width *= 1 / currentBoard.value.transform.scale;
  petaPanel.height *= 1 / currentBoard.value.transform.scale;
  petaPanel.position.sub(mouseOffset);
  petaPanel.position = new Vec2(
    panelsCenterWrapper.toLocal(petaPanel.position.clone().add(offset)),
  );
  petaPanel.index = Math.max(...petaPanelsArray.value.map((petaPanel) => petaPanel.index)) + 1;
  currentBoard.value.petaPanels[petaPanel.id] = petaPanel;
  updatePetaBoard();
}
function beginCrop(petaPanel: PetaPanel) {
  croppingPetaPanel.value = petaPanel;
  cropping.value = true;
  if (keyboards) {
    keyboards.enabled = false;
  }
}
function endCrop() {
  croppingPetaPanel.value = undefined;
  cropping.value = false;
  if (keyboards) {
    keyboards.enabled = true;
  }
}
function updateCrop(petaPanel?: PetaPanel) {
  endCrop();
  const petaImage = petaImagesStore.getPetaImage(petaPanel?.petaImageId);
  if (petaImage === undefined || currentBoard.value === undefined || petaPanel === undefined) {
    return;
  }
  const sign = petaPanel.height < 0 ? -1 : 1;
  petaPanel.height =
    Math.abs(
      petaPanel.width *
        ((petaPanel.crop.height * petaImage.height) / (petaPanel.crop.width * petaImage.width)),
    ) * sign;
  currentBoard.value.petaPanels[petaPanel.id] = petaPanel;
  load({
    reload: {
      additions: [],
      deletions: [],
    },
  });
  updatePetaBoard();
  orderPIXIRender();
}
function clearSelectionAll(force = false) {
  if (!Keyboards.pressedOR("ShiftLeft", "ShiftRight") || force) {
    pPanelsArray().forEach((pPanel) => (pPanel.petaPanel._selected = false));
  }
}
function sortIndex() {
  if (!currentBoard.value) {
    return;
  }
  Object.values(currentBoard.value.petaPanels)
    .sort((a, b) => a.index - b.index)
    .forEach((petaPanel, i) => (petaPanel.index = i));
  panelsCenterWrapper.children.sort(
    (a, b) => (a as PPanel).petaPanel.index - (b as PPanel).petaPanel.index,
  );
  updatePetaBoard();
  orderPIXIRender();
}
async function load(params: {
  reload?: {
    additions: string[];
    deletions: string[];
  };
}): Promise<void> {
  const log = logChunk().log;
  endCrop();
  // リロードじゃないならクリア。
  if (params.reload === undefined) {
    pPanelsArray().forEach(removePPanel);
    pTransformer.pPanels = pPanels = {};
  }
  if (currentBoard.value === undefined) {
    return;
  }
  const petaPanels = Object.values(currentBoard.value.petaPanels);
  if (
    params.reload &&
    params.reload.additions.length === 0 &&
    params.reload.deletions.length === 0
  ) {
    petaPanels.forEach((petaPanel) => {
      const pPanel = pPanels[petaPanel.id];
      if (pPanel) {
        pPanel.petaPanel = petaPanel;
      }
    });
    return;
  }
  Cursor.setCursor("wait");
  extracting.value = true;
  loading.value = true;
  loadProgress.value = 0;
  extractProgress.value = 0;
  if (cancelExtract !== undefined) {
    log("vBoard", `canceling loading`);
    pPanelsArray().forEach((pPanel) => pPanel.cancelLoading());
    await cancelExtract();
    log("vBoard", `canceled loading`);
    return load(params);
  }
  if (petaPanels.length === 0) {
    extracting.value = false;
    loading.value = false;
    Cursor.setDefaultCursor();
    statesStore.state.value.loadedPetaBoardId = currentBoard.value.id;
    return;
  }
  log("vBoard", `load(${params.reload ? "reload" : "full"})`, minimId(currentBoard.value.id));
  let loaded = 0;
  const extract = async (petaPanel: PetaPanel, index: number) => {
    if (currentBoard.value === undefined) {
      return;
    }
    const progress = `${index + 1}/${petaPanels.length}`;
    let loadResult = "";
    try {
      const onLoaded = (petaPanel: PetaPanel) => {
        loaded++;
        if (currentBoard.value) {
          loadProgress.value = Math.floor((loaded / petaPanels.length) * 100);
          const progress = `${loaded}/${petaPanels.length}`;
          extractingLog.value =
            `load complete   (${minimId(petaPanel.petaImageId)}):${progress}\n` +
            extractingLog.value;
          if (loaded == petaPanels.length) {
            loading.value = false;
          }
        }
      };
      let pPanel = pPanels[petaPanel.id];
      if (pPanel === undefined) {
        // pPanelが無ければ作成。
        pPanel = pPanels[petaPanel.id] = new PPanel(petaPanel, petaImagesStore);
        pPanel.setZoomScale(currentBoard.value?.transform.scale || 1);
        await pPanel.init();
        pPanel.showNSFW = nsfwStore.state.value;
        pPanel.onUpdateGIF = onUpdateGif;
        panelsCenterWrapper.addChild(pPanel);
        pPanel.orderRender();
        orderPIXIRender();
        (async () => {
          try {
            await pPanel.load();
          } catch (error) {
            //
          }
          pPanel.orderRender();
          orderPIXIRender();
          onLoaded(petaPanel);
        })();
        await new Promise((res) => {
          setTimeout(res);
        });
        loadResult = "create";
      } else if (params.reload && params.reload.deletions.includes(petaPanel.petaImageId)) {
        // petaImageが無ければnoImageに。
        pPanel.noImage = true;
        loadResult = "delete";
        onLoaded(petaPanel);
      } else if (
        params.reload &&
        pPanel.noImage &&
        params.reload.additions.includes(petaPanel.petaImageId)
      ) {
        // pPanelはあるが、noImageだったら再ロードトライ。
        (async () => {
          try {
            await pPanel.load();
          } catch (error) {
            //
          }
          pPanel.orderRender();
          orderPIXIRender();
          onLoaded(petaPanel);
        })();
        await new Promise((res) => {
          setTimeout(res);
        });
        loadResult = "reload";
      } else {
        onLoaded(petaPanel);
        loadResult = "skip";
      }
      log("vBoard", `loaded[${loadResult}](${minimId(petaPanel.petaImageId)}):`, progress);
      extractingLog.value =
        `extract complete(${minimId(petaPanel.petaImageId)}):${progress}\n` + extractingLog.value;
    } catch (error) {
      log("vBoard", `loderr(${minimId(petaPanel.petaImageId)}):`, progress, error);
      extractingLog.value =
        `extract error   (${minimId(petaPanel.petaImageId)}):${progress}\n` + extractingLog.value;
    }
    extractProgress.value = ((index + 1) / petaPanels.length) * 100;
  };
  const extraction = ppa(extract, petaPanels);
  cancelExtract = extraction.cancel;
  try {
    await extraction.promise;
  } catch (error) {
    log("vBoard", "load error:", error);
  }
  extracting.value = false;
  extractingLog.value = "";
  cancelExtract = undefined;
  log("vBoard", "load complete");
  sortIndex();
  Object.values(pPanels).forEach((pPanel) => {
    if (!pPanel.petaPanel.gif.stopped) {
      pPanel.playGIF();
    }
  });
  Cursor.setDefaultCursor();
  statesStore.state.value.loadedPetaBoardId = currentBoard.value.id;
}
function onUpdateGif() {
  if (extracting.value) {
    return;
  }
  orderPIXIRender();
}
function pointerdownPPanel(pPanel: PPanel, e: PIXI.InteractionEvent) {
  if (!currentBoard.value) {
    return;
  }
  if (
    !Keyboards.pressedOR("ShiftLeft", "ShiftRight") &&
    (selectedPPanels().length <= 1 || !pPanel.petaPanel._selected)
  ) {
    // シフトなし。かつ、(１つ以下の選択か、自身が未選択の場合)
    // 最前にして選択リセット
    clearSelectionAll();
  }
  if (selectedPPanels().length <= 1) {
    // 選択が１つ以下の場合選択範囲リセット
    clearSelectionAll();
  }
  pPanel.petaPanel._selected = true;
  layer.value?.scrollTo(pPanel.petaPanel);
  pTransformer.pointerdownPPanel(pPanel, e);
}
function orderPIXIRender() {
  renderOrdered = true;
}
function renderPIXI() {
  if (renderOrdered) {
    animate();
    pixi?.render();
    renderOrdered = false;
  }
  requestAnimationFrameHandle = requestAnimationFrame(renderPIXI);
}
function updateAnimatedGIF(deltaTime: number) {
  Object.values(pPanels)
    .filter((pPanel) => pPanel.isGIF)
    .forEach((pPanel) => pPanel.updateGIF(deltaTime));
}
function keyShift(pressed: boolean) {
  pTransformer.fit = pressed;
}
function pPanelsArray() {
  return Object.values(pPanels);
}
function selectedPPanels() {
  return pPanelsArray().filter(
    (pPanel) => pPanel.petaPanel._selected && pPanel.petaPanel.visible && !pPanel.petaPanel.locked,
  );
}
function unselectedPPanels() {
  return pPanelsArray().filter((pPanel) => !pPanel.petaPanel._selected);
}
function updatePetaBoard() {
  if (currentBoard.value) {
    emit("update:board", currentBoard.value);
  }
}
function updatePetaPanels() {
  updatePetaBoard();
}
function updatePetaPanelsFromLayer(petaPanels: PetaPanel[]) {
  petaPanels.forEach((petaPanel) => {
    if (currentBoard.value === undefined) {
      return;
    }
    currentBoard.value.petaPanels[petaPanel.id] = petaPanel;
  });
  load({
    reload: {
      additions: [],
      deletions: [],
    },
  });
  updatePetaPanels();
}
const petaPanelsArray = computed(() => {
  if (!currentBoard.value) {
    return [];
  }
  return Object.values(currentBoard.value?.petaPanels);
});
watch(
  () => nsfwStore.state.value,
  () => {
    pPanelsArray().forEach((pp) => (pp.showNSFW = nsfwStore.state.value));
    orderPIXIRender();
  },
);
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
      load({});
    } else {
      // 同じならデータの参照のみ更新
      load({
        reload: {
          additions: [],
          deletions: [],
        },
      });
    }
  },
);

defineExpose({
  load,
  addPanel,
  orderPIXIRender,
  clearSelectionAll,
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
