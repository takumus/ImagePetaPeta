<template>
  <t-board-root
    ref="boardRoot"
    v-show="board"
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
      v-show="!detailsMode"
      :zIndex="1"
      :visible="true"
      :pPanelsArray="board?.petaPanels"
      @sortIndex="sortIndex"
      @petaPanelMenu="petaPanelMenu"
      @update="orderPIXIRender"
    />
  </t-board-root>
</template>

<script setup lang="ts">
// Vue
import { computed, ref, onMounted, onUnmounted, watch, getCurrentInstance } from "vue";
import { Prop, Ref, Watch } from "vue-property-decorator";
// Components
import VCrop from "@/rendererProcess/components/board/VCrop.vue";
import VBoardLoading from "@/rendererProcess/components/board/VBoardLoading.vue";
import VLayer from "@/rendererProcess/components/layer/VLayer.vue";
// Others
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
import { promiseSerial } from "@/commons/utils/promiseSerial";
import { Keyboards } from "@/rendererProcess/utils/keyboards";
import * as Cursor from "@/rendererProcess/utils/cursor";
import { logChunk } from "@/rendererProcess/utils/rendererLogger";
import { Rectangle } from "pixi.js";
import { API } from "@/rendererProcess/api";
import { WindowType } from "@/commons/datas/windowType";
import { useNSFWStore } from "@/rendererProcess/stores/nsfwStore";
import { PSelection } from "./PSelection";
const emit = defineEmits<{
  (e: "change", board: PetaBoard): void;
}>();
const props = defineProps<{
  detailsMode: boolean;
  board?: PetaBoard;
  zIndex: number;
}>();
const nsfwStore = useNSFWStore();
const _this = getCurrentInstance()!.proxy!;
const panelsBackground = ref<HTMLElement>();
const layer = ref<VLayer>();
const extracting = ref(false);
const loading = ref(false);
const extractingLog = ref("");
const extractProgress = ref(0);
const loadProgress = ref(0);
const croppingPetaPanel = ref<PetaPanel>();
const cropping = ref(false);
const dragging = ref(false);

const dragOffset = new Vec2();
const click = new ClickChecker();
let resizer: ResizeObserver | undefined;
let pixi: PIXI.Application | undefined;
const rootContainer = new PIXI.Container();
const centerWrapper = new PIXI.Container();
const panelsCenterWrapper = new PIXI.Container();
const backgroundSprite = new PIXI.Graphics();
const selectingBackground = new PIXI.Graphics();
const pSelection = new PSelection();
const crossLine = new PIXI.Graphics();
let pPanels: { [key: string]: PPanel } = {};
const pTransformer = new PTransformer(pPanels);
// let draggingPanels = false;
let mouseLeftPressing = false;
let mouseRightPressing = false;
let renderOrdered = false;
let selecting = false;
let requestAnimationFrameHandle = 0;
const stageRect = new Vec2();
const mousePosition = new Vec2();
let keyboards: Keyboards | undefined = new Keyboards();
let cancelExtract: (() => Promise<void[]>) | undefined;
let resolution = -1;
const resolutionMatchMedia = matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
const mouseOffset = new Vec2();
onMounted(() => {
  setTimeout(() => {
    constructIfResolutionChanged();
  }, 200);
  resolutionMatchMedia.addEventListener("change", constructIfResolutionChanged);
});
onUnmounted(() => {
  destruct();
  resolutionMatchMedia.removeEventListener("change", constructIfResolutionChanged);
});
function constructIfResolutionChanged() {
  if (resolution != window.devicePixelRatio) {
    destruct();
    construct();
    resolution = window.devicePixelRatio;
  }
}
function construct() {
  logChunk().log("construct PIXI");
  PIXI.settings.MIPMAP_TEXTURES = PIXI.MIPMAP_MODES.OFF;
  pixi = new PIXI.Application({
    resolution: window.devicePixelRatio,
    antialias: true,
    backgroundAlpha: 0,
  });
  pixi.view.addEventListener("dblclick", resetTransform);
  pixi.view.addEventListener("mousewheel", wheel as any);
  pixi.view.addEventListener("pointerdown", preventWheelClick);
  pixi.stage.on("pointerdown", pointerdown);
  pixi.stage.on("pointerup", pointerup);
  pixi.stage.on("pointerupoutside", pointerup);
  pixi.stage.on("pointermove", pointermove);
  pixi.stage.on("pointermoveoutside", pointermove);
  pixi.stage.on("pointerup", (e) => pTransformer.pointerup(e));
  pixi.stage.on("pointerupoutside", (e) => pTransformer.pointerup(e));
  pixi.stage.on("pointermove", (e) => pTransformer.pointermove(e));
  pixi.stage.on("pointermoveoutside", (e) => pTransformer.pointermove(e));
  if (!props.detailsMode) {
    pixi.stage.addChild(backgroundSprite);
    pixi.stage.addChild(crossLine);
  }
  pixi.stage.addChild(centerWrapper);
  centerWrapper.addChild(rootContainer);
  rootContainer.addChild(panelsCenterWrapper);
  rootContainer.addChild(pTransformer);
  rootContainer.addChild(pSelection);
  panelsBackground.value?.appendChild(pixi.view);
  pixi.stage.interactive = true;
  pixi.ticker.stop();
  resizer = new ResizeObserver((entries) => {
    resize(entries[0]!.contentRect);
  });
  if (panelsBackground.value) {
    resizer.observe(panelsBackground.value);
  }
  renderPIXI();
  keyboards = new Keyboards();
  keyboards.enabled = !props.detailsMode;
  keyboards.down(["Delete"], keyDelete);
  keyboards.down(["Backspace"], keyBackspace);
  keyboards.change(["ShiftLeft", "ShiftRight"], keyShift);
  PIXI.Ticker.shared.add(updateAnimatedGIF);
}
function destruct() {
  if (pixi) {
    logChunk().log("destruct PIXI");
    pixi.view.removeEventListener("dblclick", resetTransform);
    pixi.view.removeEventListener("mousewheel", wheel as any);
    pixi.view.removeEventListener("pointerdown", preventWheelClick);
    pixi.destroy(true);
  }
  if (panelsBackground.value) {
    resizer?.unobserve(panelsBackground.value);
  }
  resizer?.disconnect();
  keyboards?.destroy();
  PIXI.Ticker.shared.remove(updateAnimatedGIF);
  cancelAnimationFrame(requestAnimationFrameHandle);
}
function resize(rect: DOMRectReadOnly) {
  stageRect.x = rect.width;
  stageRect.y = rect.height;
  mouseOffset.set(panelsBackground.value?.getBoundingClientRect());
  updateDetailsPetaPanel();
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
  orderPIXIRender();
}
function preventWheelClick(event: PointerEvent) {
  if (event.button === MouseButton.MIDDLE) {
    event.preventDefault();
  }
}
function pointerdown(e: PIXI.InteractionEvent) {
  if (!props.board) {
    return;
  }
  const mouse = getMouseFromEvent(e);
  click.down(mouse);
  if (
    e.data.button === MouseButton.RIGHT ||
    e.data.button === MouseButton.MIDDLE ||
    (props.detailsMode && e.data.button === MouseButton.LEFT)
  ) {
    mouseRightPressing = true;
    dragging.value = true;
    dragOffset.set(props.board.transform.position).sub(mouse);
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
  // console.log(object)
  // if (pPanelsArray().find((c) => c === object)) {
  //   return object as PPanel;
  // }
  // return null;
  if ((object as PPanel).petaPanel !== undefined) {
    return object as PPanel;
  }
  return undefined;
}
function pointerup(e: PIXI.InteractionEvent) {
  const mouse = getMouseFromEvent(e).add(mouseOffset);
  if (
    e.data.button === MouseButton.RIGHT ||
    e.data.button === MouseButton.MIDDLE ||
    (props.detailsMode && e.data.button === MouseButton.LEFT)
  ) {
    mouseRightPressing = false;
    if (click.isClick && e.data.button === MouseButton.RIGHT) {
      const pPanel = getPPanelFromObject(e.target);
      if (pPanel) {
        pointerdownPPanel(pPanel, e);
        selectedPPanels().forEach((pPanel) => (pPanel.dragging = false));
        petaPanelMenu(pPanel.petaPanel, new Vec2(mouse));
      } else if (!props.detailsMode) {
        _this.$components.contextMenu.open(
          [
            {
              label: _this.$t("boards.menu.openBrowser"),
              click: () => {
                API.send("openWindow", WindowType.BROWSER);
              },
            },
            { separate: true },
            {
              label: _this.$t("boards.menu.resetPosition"),
              click: () => {
                resetTransform();
              },
            },
          ],
          new Vec2(mouse),
        );
      }
    }
    dragging.value = false;
  } else if (e.data.button === MouseButton.LEFT) {
    mouseLeftPressing = false;
    pPanelsArray().forEach((pPanel) => {
      pPanel.dragging = false;
    });
    selecting = false;
  }
  orderPIXIRender();
}
function pointermove(e: PIXI.InteractionEvent) {
  const mouse = getMouseFromEvent(e);
  mousePosition.set(mouse);
  pTransformer.mousePosition.set(mouse);
  click.move(mousePosition);
  if (mouseLeftPressing || mouseRightPressing) {
    orderPIXIRender();
  }
}
function getMouseFromEvent(e: PIXI.InteractionEvent) {
  return new Vec2(e.data.global);
}
function wheel(event: WheelEvent) {
  if (!props.board) {
    return;
  }
  const mouse = vec2FromPointerEvent(event).sub(mouseOffset).sub(stageRect.clone().div(2));
  if (event.ctrlKey || _this.$systemInfo.platform === "win32") {
    const currentZoom = props.board.transform.scale;
    ref(props.board).value.transform.scale *= 1 + -event.deltaY * _this.$settings.zoomSensitivity * 0.00001;
    if (props.board.transform.scale > BOARD_ZOOM_MAX) {
      ref(props.board).value.transform.scale = BOARD_ZOOM_MAX;
    } else if (props.board.transform.scale < BOARD_ZOOM_MIN) {
      ref(props.board).value.transform.scale = BOARD_ZOOM_MIN;
    }
    props.board.transform.position
      .mult(-1)
      .add(mouse)
      .mult(props.board.transform.scale / currentZoom)
      .sub(mouse)
      .mult(-1);
  } else {
    props.board.transform.position.add(
      new Vec2(event.deltaX, event.deltaY).mult(_this.$settings.moveSensitivity).mult(-0.01),
    );
  }
  orderPIXIRender();
}
function updateScale() {
  if (props.board) {
    const scale = props.board.transform.scale;
    pPanelsArray().forEach((pp) => {
      pp.setZoomScale(scale);
    });
  }
}
function updateRect() {
  if (!props.board) {
    return;
  }
  crossLine.clear();
  crossLine.lineStyle(1, Number(props.board.background.lineColor.replace("#", "0x")), 1, undefined, true);
  crossLine.moveTo(-stageRect.x, 0);
  crossLine.lineTo(stageRect.x, 0);
  crossLine.moveTo(0, -stageRect.y);
  crossLine.lineTo(0, stageRect.y);
  backgroundSprite.clear();
  backgroundSprite.hitArea = new Rectangle(0, 0, stageRect.x, stageRect.y);
  backgroundSprite.beginFill(Number(props.board.background.fillColor.replace("#", "0x")));
  backgroundSprite.drawRect(0, 0, stageRect.x, stageRect.y);
}
function animate() {
  if (!props.board) {
    return;
  }
  rootContainer.scale.set(props.board.transform.scale);
  pTransformer.setScale(1 / props.board.transform.scale);
  pTransformer.update();

  if (dragging.value) {
    props.board.transform.position.set(mousePosition).add(dragOffset);
  }
  props.board.transform.position.setTo(rootContainer);
  new Vec2(panelsCenterWrapper.toGlobal(new Vec2(0, 0))).setTo(crossLine);
  const offset = 0;
  if (crossLine.x < offset) {
    crossLine.x = offset;
  } else if (crossLine.x > stageRect.x - offset) {
    crossLine.x = stageRect.x - offset;
  }
  if (crossLine.y < offset) {
    crossLine.y = offset;
  } else if (crossLine.y > stageRect.y - offset) {
    crossLine.y = stageRect.y - offset;
  }
  pSelection.clear();
  if (selecting) {
    pSelection.bottomRight.set(rootContainer.toLocal(mousePosition));
    pSelection.draw(props.board.transform.scale);
    pPanelsArray().forEach((pPanel) => {
      const pPanelRect = pPanel.getRect();
      Object.values(pPanelRect).map((position) => {
        position.set(rootContainer.toLocal(pPanel.toGlobal(position)));
      });
      pPanel.petaPanel._selected =
        hitTest(pSelection.rect, pPanelRect) && pPanel.petaPanel.visible && !pPanel.petaPanel.locked;
    });
  }
  pPanelsArray().forEach((pp) => {
    pp.unselected = false;
  });
  if (selectedPPanels().length > 0) {
    unselectedPPanels().forEach((pp) => {
      pp.unselected = true;
    });
  }
  pPanelsArray().forEach((pPanel) => {
    pPanel.orderRender();
  });
}
function resetTransform() {
  if (!props.board) {
    return;
  }
  ref(props.board).value.transform.scale = 1;
  props.board.transform.position.set(0, 0);
  orderPIXIRender();
}
function removeSelectedPanels() {
  if (!props.board) {
    return;
  }
  selectedPPanels().forEach((pPanel) => {
    removePPanel(pPanel);
  });
  ref(props.board).value.petaPanels = pPanelsArray().map((pPanel) => pPanel.petaPanel);
  orderPIXIRender();
}
function removePPanel(pPanel: PPanel) {
  panelsCenterWrapper.removeChild(pPanel);
  pPanel.destroy();
  delete pPanels[pPanel.petaPanel.id];
}
function petaPanelMenu(pPanel: PetaPanel, position: Vec2) {
  const _pPanel = pPanels[pPanel.id];
  if (props.detailsMode) {
    return;
  }
  const isMultiple = selectedPPanels().length > 1;
  _this.$components.contextMenu.open(
    [
      {
        label: _this.$t("boards.panelMenu.toFront"),
        click: () => {
          selectedPPanels().forEach((pPanel) => {
            pPanel.petaPanel.index += pPanelsArray().length;
          });
          sortIndex();
        },
      },
      {
        label: _this.$t("boards.panelMenu.toBack"),
        click: () => {
          selectedPPanels().forEach((pPanel) => {
            pPanel.petaPanel.index -= pPanelsArray().length;
          });
          sortIndex();
        },
      },
      {
        separate: true,
      },
      {
        label: _this.$t("boards.panelMenu.details"),
        click: () => {
          if (pPanel._petaImage === undefined) {
            return;
          }
          API.send("setDetailsPetaImage", pPanel._petaImage);
          API.send("openWindow", WindowType.DETAILS);
        },
      },
      {
        separate: true,
      },
      {
        skip: isMultiple || !_pPanel?.isGIF,
        label: _pPanel?.isPlayingGIF ? _this.$t("boards.panelMenu.stopGIF") : _this.$t("boards.panelMenu.playGIF"),
        click: () => {
          if (_pPanel?.isPlayingGIF) {
            _pPanel.stopGIF();
          } else {
            _pPanel?.playGIF();
          }
        },
      },
      {
        skip: isMultiple || !_pPanel?.isGIF,
        separate: true,
      },
      {
        skip: isMultiple,
        label: _this.$t("boards.panelMenu.crop"),
        click: () => {
          beginCrop(pPanel);
        },
      },
      {
        skip: isMultiple,
        separate: true,
      },
      {
        label: _this.$t("boards.panelMenu.flipHorizontal"),
        click: () => {
          selectedPPanels().forEach((pPanel) => {
            pPanel.petaPanel.width = -pPanel.petaPanel.width;
          });
        },
      },
      {
        label: _this.$t("boards.panelMenu.flipVertical"),
        click: () => {
          selectedPPanels().forEach((pPanel) => {
            pPanel.petaPanel.height = -pPanel.petaPanel.height;
          });
        },
      },
      {
        separate: true,
      },
      {
        label: _this.$t("boards.panelMenu.reset"),
        click: () => {
          selectedPPanels().forEach((pPanel) => {
            pPanel.petaPanel.height = Math.abs(pPanel.petaPanel.height);
            pPanel.petaPanel.width = Math.abs(pPanel.petaPanel.width);
            pPanel.petaPanel.crop.position.set(0, 0);
            pPanel.petaPanel.crop.width = 1;
            pPanel.petaPanel.crop.height = 1;
            pPanel.petaPanel.rotation = 0;
            updateCrop(pPanel.petaPanel);
          });
        },
      },
      { separate: true },
      {
        label: _this.$t("boards.panelMenu.remove"),
        click: () => {
          removeSelectedPanels();
        },
      },
    ],
    position,
  );
}
async function addPanel(petaPanel: PetaPanel, offsetIndex: number) {
  if (!props.board) {
    return;
  }
  endCrop();
  if (offsetIndex === 0) {
    clearSelectionAll();
  }
  const offset = new Vec2(20, 20).mult(offsetIndex);
  petaPanel.width *= 1 / props.board.transform.scale;
  petaPanel.height *= 1 / props.board.transform.scale;
  petaPanel.position.sub(mouseOffset);
  petaPanel.position = new Vec2(panelsCenterWrapper.toLocal(petaPanel.position.clone().add(offset)));
  const maxIndex = getMaxIndex();
  petaPanel.index = maxIndex + 1;
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
function updateCrop(petaPanel: PetaPanel) {
  endCrop();
  if (!petaPanel._petaImage) {
    return;
  }
  const sign = 1;
  petaPanel.height =
    Math.abs(
      petaPanel.width *
        ((petaPanel.crop.height * petaPanel._petaImage.height) / (petaPanel.crop.width * petaPanel._petaImage.width)),
    ) * sign;
  orderPIXIRender();
}
function clearSelectionAll(force = false) {
  if (!Keyboards.pressedOR("ShiftLeft", "ShiftRight") || force) {
    pPanelsArray().forEach((p) => {
      p.petaPanel._selected = false;
    });
  }
}
function sortIndex() {
  if (!props.board) {
    return;
  }
  ref(props.board)
    .value.petaPanels.sort((a, b) => a.index - b.index)
    .forEach((petaPanel, i) => {
      petaPanel.index = i;
    });
  panelsCenterWrapper.children.sort((a, b) => {
    return (a as PPanel).petaPanel.index - (b as PPanel).petaPanel.index;
  });
  orderPIXIRender();
}
function getMaxIndex() {
  if (!props.board) {
    return -1;
  }
  return Math.max(...props.board.petaPanels.map((petaPanel) => petaPanel.index));
}
async function load(params: {
  reload?: {
    additions: string[];
    deletions: string[];
  };
}): Promise<void> {
  updateDetailsPetaPanel();
  const log = logChunk().log;
  endCrop();
  Cursor.setCursor("wait");
  extracting.value = true;
  loading.value = true;
  loadProgress.value = 0;
  extractProgress.value = 0;
  if (cancelExtract !== undefined) {
    log("vBoard", `canceling loading`);
    pPanelsArray().forEach((pPanel) => {
      pPanel.cancelLoading();
    });
    await cancelExtract();
    log("vBoard", `canceled loading`);
    return load(params);
  }
  // リロードじゃないならクリア。
  if (params.reload === undefined) {
    pPanelsArray().forEach((pPanel) => {
      removePPanel(pPanel);
    });
    pTransformer.pPanels = pPanels = {};
  }
  if (!props.board) {
    return;
  }
  if (props.board.petaPanels.length === 0) {
    extracting.value = false;
    loading.value = false;
    Cursor.setDefaultCursor();
    _this.$states.loadedPetaBoardId = props.board.id;
    return;
  }
  log("vBoard", `load(${params.reload ? "reload" : "full"})`, minimId(props.board.id));
  let loaded = 0;
  const extract = async (petaPanel: PetaPanel, index: number) => {
    if (props.board === undefined) {
      return;
    }
    const progress = `${index + 1}/${props.board.petaPanels.length}`;
    let loadResult = "";
    try {
      const onLoaded = (petaPanel: PetaPanel) => {
        loaded++;
        if (props.board) {
          loadProgress.value = Math.floor((loaded / props.board.petaPanels.length) * 100);
          const progress = `${loaded}/${props.board.petaPanels.length}`;
          extractingLog.value =
            `load complete   (${minimId(petaPanel._petaImage?.id)}):${progress}\n` + extractingLog.value;
          if (loaded == props.board.petaPanels.length) {
            loading.value = false;
          }
        }
      };
      if (pPanels[petaPanel.id] === undefined) {
        // pPanelが無ければ作成。
        const pPanel = (pPanels[petaPanel.id] = new PPanel(petaPanel));
        pPanel.setZoomScale(props.board?.transform.scale || 1);
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
        pPanels[petaPanel.id]!.noImage = true;
        loadResult = "delete";
        onLoaded(petaPanel);
      } else if (
        params.reload &&
        pPanels[petaPanel.id]!.noImage &&
        params.reload.additions.includes(petaPanel.petaImageId)
      ) {
        // pPanelはあるが、noImageだったら再ロードトライ。
        (async () => {
          try {
            await pPanels[petaPanel.id]!.load();
          } catch (error) {
            //
          }
          pPanels[petaPanel.id]!.orderRender();
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
      log("vBoard", `loaded[${loadResult}](${minimId(petaPanel._petaImage?.id)}):`, progress);
      extractingLog.value =
        `extract complete(${minimId(petaPanel._petaImage?.id)}):${progress}\n` + extractingLog.value;
    } catch (error) {
      log("vBoard", `loderr(${minimId(petaPanel._petaImage?.id)}):`, progress, error);
      extractingLog.value =
        `extract error   (${minimId(petaPanel._petaImage?.id)}):${progress}\n` + extractingLog.value;
    }
    extractProgress.value = ((index + 1) / props.board.petaPanels.length) * 100;
  };
  const extraction = promiseSerial(extract, [...props.board.petaPanels]);
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
  if (!props.detailsMode) {
    _this.$states.loadedPetaBoardId = props.board.id;
  }
}
function onUpdateGif() {
  if (extracting.value) {
    return;
  }
  orderPIXIRender();
}
function pointerdownPPanel(pPanel: PPanel, e: PIXI.InteractionEvent) {
  const mouse = getMouseFromEvent(e);
  if (!props.board || props.detailsMode) {
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
  Object.values(pPanels).forEach((pPanel) => {
    if (pPanel.isGIF) {
      pPanel.updateGIF(deltaTime);
    }
  });
}
function keyDelete() {
  removeSelectedPanels();
}
function keyBackspace() {
  removeSelectedPanels();
}
function keyShift(pressed: boolean) {
  pTransformer.fit = pressed;
}
function updateDetailsPetaPanel() {
  if (!props.detailsMode) {
    return;
  }
  const petaPanel = props.board?.petaPanels[0];
  const petaImage = petaPanel?._petaImage;
  if (petaPanel && petaImage) {
    let width = 0;
    let height = 0;
    const maxWidth = stageRect.x * 0.9;
    const maxHeight = stageRect.y * 0.9;
    if (petaImage.height / petaImage.width < maxHeight / maxWidth) {
      width = maxWidth;
      height = maxWidth * petaImage.height;
    } else {
      height = maxHeight;
      width = maxHeight / petaImage.height;
    }
    petaPanel.width = width;
    petaPanel.height = height;
  }
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
// const pPanelsArray = computed(() => {
//   return Object.values(pPanels.value);
// });
// const selectedPPanels = computed(() => {
//   return pPanelsArray().filter((pPanel) => pPanel.selected && pPanel.petaPanel.visible && !pPanel.petaPanel.locked);
// });
// const unselectedPPanels = computed(() => {
//   return pPanelsArray().filter((pPanel) => !pPanel.selected);
// });
// watch(() => nsfwStore.state.value, () => {
//   pPanelsArray().forEach((pp) => {
//     pp.showNSFW = nsfwStore.state.value;
//   });
//   orderPIXIRender();
// });
// watch(() => props.board?.petaPanels, () => {
//   emit("change", props.board!);
// }, { deep: true });
// watch(() => props.board?.transform, () => {
//   updateRect();
//   updateScale();
//   emit("change", props.board!);
// }, { deep: true });
watch(
  () => props.board?.background,
  () => {
    updateRect();
    emit("change", props.board!);
    orderPIXIRender();
  },
);
watch(
  () => props.board?.id,
  () => {
    load({});
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
