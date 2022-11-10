<template>
  <t-crop-root ref="cropRoot" v-show="loaded">
    <t-buttons>
      <button @click="updateCrop">{{ t("boards.crop.apply") }}</button>
      <button @click="resetCrop">{{ t("boards.crop.reset") }}</button>
      <button @click="cancelCrop">{{ t("boards.crop.cancel") }}</button>
    </t-buttons>
  </t-crop-root>
</template>

<script setup lang="ts">
// Vue
import { ref, onMounted, onUnmounted, watch, computed } from "vue";
// Components

// Others
import { Vec2 } from "@/commons/utils/vec2";
import * as PIXI from "pixi.js";
import { createPetaPanel, PetaPanel } from "@/commons/datas/petaPanel";
import { PPanel } from "@/rendererProcess/components/board/ppanels/PPanel";
import { PTransformerDashedLine } from "@/rendererProcess/components/board/ppanels/pTransformer/PTransformerDashedLine";
import { PTransformerControlPoint } from "@/rendererProcess/components/board/ppanels/pTransformer/PTransformerControlPoint";
import { useKeyboardsStore } from "@/rendererProcess/stores/keyboardsStore";
import { useNSFWStore } from "@/rendererProcess/stores/nsfwStore";
import { useI18n } from "vue-i18n";
import { usePetaImagesStore } from "@/rendererProcess/stores/petaImagesStore";
import { resizeImage } from "@/commons/utils/resizeImage";
import { useResizerStore } from "@/rendererProcess/stores/resizerStore";
const props = defineProps<{
  petaPanel?: PetaPanel;
}>();
const emit = defineEmits<{
  (e: "update", petaPanel?: PetaPanel): void;
}>();
const nsfwStore = useNSFWStore();
const petaImagesStore = usePetaImagesStore();
const { t } = useI18n();
const resizerStore = useResizerStore();
const cropRoot = ref<HTMLElement>();
let pixi: PIXI.Application;
const rootContainer = new PIXI.Container();
const selectionContainer = new PIXI.Container();
let renderOrdered = false;
let requestAnimationFrameHandle = 0;
const stageRect = new Vec2();
const mousePosition = new Vec2();
const prevMousePosition = new Vec2();
const keyboards = useKeyboardsStore();
const selection = new PTransformerDashedLine();
let pPanel: PPanel | undefined;
const corners: PTransformerControlPoint[] = [];
const blackMask = new PIXI.Graphics();
let draggingControlPoint: PTransformerControlPoint | undefined;
const minX = ref(0);
const maxX = ref(0);
const minY = ref(0);
const maxY = ref(0);
const dragging = ref(false);
const loaded = ref(false);
let pixiView: HTMLCanvasElement | undefined;
onMounted(() => {
  pixi = new PIXI.Application({
    resolution: window.devicePixelRatio,
    antialias: true,
    backgroundAlpha: 0,
  });
  pixiView = pixi.view as HTMLCanvasElement;
  pixi.stage.on("pointerup", pointerup);
  pixi.stage.on("pointerupoutside", pointerup);
  pixi.stage.on("pointermove", pointermove);
  // pixi.stage.on("pointermoveoutside", pointermove);
  pixi.stage.interactive = true;
  pixi.ticker.stop();
  pixi.stage.addChild(rootContainer);
  cropRoot.value?.appendChild(pixiView);
  rootContainer.addChild(blackMask, selectionContainer);
  selectionContainer.addChild(selection);
  selection.interactive = true;
  selection.on("pointerdown", beginMoveSelection);
  for (let i = 0; i < 8; i++) {
    const cp = new PTransformerControlPoint(i);
    cp.rotate.interactive = false;
    if (i != 3 && i != 7) {
      if (i === 0 || i === 1 || i === 2) {
        cp.yPosition = -1;
      } else {
        cp.yPosition = 1;
      }
    } else {
      cp.yPosition = 0;
    }
    if (i != 1 && i != 5) {
      if (i === 2 || i === 3 || i === 4) {
        cp.xPosition = 1;
      } else {
        cp.xPosition = -1;
      }
    } else {
      cp.xPosition = 0;
    }
    cp.size.on("pointerdown", (e) => {
      startDrag(e, cp);
    });
    corners.push(cp);
  }
  selectionContainer.addChild(...corners);
  // PIXI.Ticker.shared.add(updateAnimatedGIF);
  resizerStore.on("resize", resize);
  resizerStore.observe(cropRoot.value);
  renderPIXI();
  keyboards.enabled = true;
  changePetaPanel();
});
function startDrag(e: PIXI.FederatedPointerEvent, controlPoint: PTransformerControlPoint) {
  draggingControlPoint = controlPoint;
}
function beginMoveSelection(e: PIXI.FederatedPointerEvent) {
  prevMousePosition.set(e.data.global);
  dragging.value = true;
}
onUnmounted(() => {
  if (pixiView !== undefined) {
    cropRoot.value?.removeChild(pixiView);
  }
  pixi.destroy();
  cancelAnimationFrame(requestAnimationFrameHandle);
});
function resize(rect: DOMRectReadOnly) {
  stageRect.x = rect.width;
  stageRect.y = rect.height;
  pixi.renderer.resize(rect.width, rect.height);
  if (pixiView !== undefined) {
    pixiView.style.width = rect.width + "px";
    pixiView.style.height = rect.height + "px";
  }
  rootContainer.x = rect.width / 2;
  rootContainer.y = rect.height / 2;
  orderPIXIRender();
}
function pointerup() {
  draggingControlPoint = undefined;
  dragging.value = false;
}
function pointermove(e: PIXI.FederatedPointerEvent) {
  mousePosition.set(e.data.global);
  if (draggingControlPoint) {
    const pos = selectionContainer.toLocal(mousePosition);
    if (draggingControlPoint.xPosition === -1) {
      minX.value = pos.x / width.value;
    }
    if (draggingControlPoint.xPosition === 1) {
      maxX.value = pos.x / width.value;
    }
    if (draggingControlPoint.yPosition === -1) {
      minY.value = pos.y / height.value;
    }
    if (draggingControlPoint.yPosition === 1) {
      maxY.value = pos.y / height.value;
    }
  }
  if (dragging.value) {
    const diff = mousePosition.clone().sub(prevMousePosition);
    prevMousePosition.set(mousePosition);
    diff.x /= width.value;
    diff.y /= height.value;
    minX.value += diff.x;
    maxX.value += diff.x;
    minY.value += diff.y;
    maxY.value += diff.y;
  }
  if (draggingControlPoint || dragging.value) {
    const _minX = Math.min(minX.value, maxX.value);
    const _maxX = Math.max(minX.value, maxX.value);
    const _minY = Math.min(minY.value, maxY.value);
    const _maxY = Math.max(minY.value, maxY.value);
    minX.value = _minX;
    maxX.value = _maxX;
    minY.value = _minY;
    maxY.value = _maxY;
    if (minX.value < 0) {
      minX.value = 0;
    }
    if (maxX.value > 1) {
      maxX.value = 1;
    }
    if (minY.value < 0) {
      minY.value = 0;
    }
    if (maxY.value > 1) {
      maxY.value = 1;
    }
    orderPIXIRender();
  }
}
// function updateAnimatedGIF(deltaTime: number) {
//   if (pPanel?.isGIF) {
//     pPanel.updateGIF(deltaTime);
//   }
// }
function animate() {
  if (!pPanel || !props.petaPanel) {
    return;
  }
  selection.setCorners(sevenCorners.value);
  selection.update();
  pPanel.position.x = 0;
  pPanel.position.y = 0;
  pPanel.petaPanel.width = width.value;
  pPanel.petaPanel.height = height.value;
  selectionContainer.x = -pPanel.petaPanel.width / 2;
  selectionContainer.y = -pPanel.petaPanel.height / 2;
  pPanel.orderRender();
  corners.forEach((corner, i) => {
    sevenCorners.value[i]?.setTo(corner);
  });
  blackMask.x = -rootContainer.x;
  blackMask.y = -rootContainer.y;
  const topLeft = new Vec2(
    selection.toGlobal(new Vec2(minX.value * width.value, minY.value * height.value)),
  );
  const bottomRight = new Vec2(topLeft).add(
    new Vec2((maxX.value - minX.value) * width.value, (maxY.value - minY.value) * height.value),
  );
  blackMask.clear();
  blackMask.beginFill(0x000000, 0.5);
  blackMask.drawRect(0, 0, stageRect.x, topLeft.y);
  blackMask.drawRect(0, bottomRight.y, stageRect.x, stageRect.y - bottomRight.y);
  blackMask.drawRect(0, topLeft.y, topLeft.x, bottomRight.y - topLeft.y);
  blackMask.drawRect(
    bottomRight.x,
    topLeft.y,
    stageRect.x - bottomRight.x,
    bottomRight.y - topLeft.y,
  );
  selection.hitArea = new PIXI.Rectangle(
    minX.value * width.value,
    minY.value * height.value,
    (maxX.value - minX.value) * width.value,
    (maxY.value - minY.value) * height.value,
  );
}
function orderPIXIRender() {
  renderOrdered = true;
}
function renderPIXI() {
  if (renderOrdered) {
    animate();
    pixi.render();
    renderOrdered = false;
  }
  requestAnimationFrameHandle = requestAnimationFrame(renderPIXI);
}
function updateCrop() {
  if (!props.petaPanel) {
    return;
  }
  // props.petaPanel.crop.position.x = minX.value;
  // props.petaPanel.crop.position.y = minY.value;
  // props.petaPanel.crop.width = maxX.value - minX.value;
  // props.petaPanel.crop.height = maxY.value - minY.value;
  emit("update", {
    ...props.petaPanel,
    crop: {
      ...props.petaPanel.crop,
      position: new Vec2(minX.value, minY.value),
      width: maxX.value - minX.value,
      height: maxY.value - minY.value,
    },
  });
}
function cancelCrop() {
  emit("update", undefined);
}
function resetCrop() {
  minX.value = 0;
  minY.value = 0;
  maxX.value = 1;
  maxY.value = 1;
  orderPIXIRender();
}
function changePetaPanel() {
  const petaImage = petaImagesStore.getPetaImage(props.petaPanel?.petaImageId);
  if (petaImage === undefined || props.petaPanel === undefined) {
    cancelCrop();
    return;
  }
  const petaPanel = createPetaPanel(petaImage, new Vec2(0, 0), 400);
  minX.value = props.petaPanel.crop.position.x;
  minY.value = props.petaPanel.crop.position.y;
  maxX.value = props.petaPanel.crop.width + props.petaPanel.crop.position.x;
  maxY.value = props.petaPanel.crop.height + props.petaPanel.crop.position.y;
  if (!pPanel) {
    pPanel = new PPanel(petaPanel, petaImagesStore);
    pPanel.onUpdateGIF = () => {
      orderPIXIRender();
    };
    rootContainer.addChildAt(pPanel, 0);
  } else {
    pPanel.setPetaPanel(petaPanel);
  }
  (async () => {
    if (!pPanel) {
      return;
    }
    await pPanel.init();
    pPanel.showNSFW = nsfwStore.state.value;
    await pPanel.load();
    pPanel.playGIF();
    loaded.value = true;
  })();
}
const height = computed(() => {
  const petaImage = petaImagesStore.getPetaImage(props.petaPanel?.petaImageId);
  if (!petaImage) {
    return 0;
  }
  return width.value * (petaImage.height / petaImage.width);
});
const width = computed(() => {
  const petaImage = petaImagesStore.getPetaImage(props.petaPanel?.petaImageId);
  if (pPanel === undefined || petaImage === undefined || props.petaPanel === undefined) {
    return 0;
  }
  let width = 0;
  let height = 0;
  const maxWidth = stageRect.x * 0.95;
  const maxHeight = stageRect.y * 0.7;
  if (petaImage.height / petaImage.width < maxHeight / maxWidth) {
    const size = resizeImage(petaImage.width, petaImage.height, maxWidth, "width");
    width = size.width;
    height = size.height;
  } else {
    const size = resizeImage(petaImage.width, petaImage.height, maxHeight, "height");
    height = size.height;
    width = size.width;
  }
  height;
  return width;
});
const sevenCorners = computed(() => {
  const corners = [
    new Vec2(minX.value, minY.value),
    new Vec2((maxX.value + minX.value) / 2, minY.value),
    new Vec2(maxX.value, minY.value),
    new Vec2(maxX.value, (maxY.value + minY.value) / 2),
    new Vec2(maxX.value, maxY.value),
    new Vec2((maxX.value + minX.value) / 2, maxY.value),
    new Vec2(minX.value, maxY.value),
    new Vec2(minX.value, (maxY.value + minY.value) / 2),
  ];
  return corners.map((p) => new Vec2(p.x * width.value, p.y * height.value));
});
// @Watch("petaPanel")
watch(() => props.petaPanel, changePetaPanel);
watch(nsfwStore.state, () => {
  if (!pPanel) {
    return;
  }
  pPanel.showNSFW = nsfwStore.state.value;
  orderPIXIRender();
});
</script>

<style lang="scss" scoped>
t-crop-root {
  position: absolute;
  top: 0px;
  left: 0px;
  width: 100%;
  height: 100%;
  background-repeat: repeat;
  background-image: url("~@/@assets/transparentBackground.png");
  display: block;
  > t-buttons {
    display: block;
    position: absolute;
    transform: translateX(-50%);
    bottom: var(--px-2);
    left: 50%;
  }
}
</style>
