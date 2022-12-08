<template>
  <t-details-root
    :style="{
      zIndex: zIndex,
    }">
    <VPIXI
      ref="vPixi"
      :antialias="false"
      @construct="construct"
      @lose-context="loseContext"
      @resize="resize" />
    <t-playback-controller-wrapper>
      <t-playback-controller>
        <VPlaybackController
          v-if="pPlayableFileObjectContent"
          :p-file-object-content="pPlayableFileObjectContent" />
      </t-playback-controller>
    </t-playback-controller-wrapper>
  </t-details-root>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";

import VPlaybackController from "@/renderer/components/commons/playbackController/VPlaybackController.vue";
import VPIXI from "@/renderer/components/commons/utils/pixi/VPIXI.vue";

import { RPetaFile } from "@/commons/datas/rPetaFile";
import { BOARD_ZOOM_MAX, BOARD_ZOOM_MIN } from "@/commons/defines";
import { resizeImage } from "@/commons/utils/resizeImage";
import { Vec2, vec2FromPointerEvent } from "@/commons/utils/vec2";

import { PIXIRect } from "@/renderer/components/commons/utils/pixi/rect";
import { IPC } from "@/renderer/libs/ipc";
// import { useNSFWStore } from "@/renderer/stores/nsfwStore/useNSFWStore";
import { useSettingsStore } from "@/renderer/stores/settingsStore/useSettingsStore";
import { useSystemInfoStore } from "@/renderer/stores/systemInfoStore/useSystemInfoStore";
import { PFileObject } from "@/renderer/utils/pFileObject";
import { PFileObjectContent } from "@/renderer/utils/pFileObject/pFileObjectContent";
import { PPlayableFileObjectContent } from "@/renderer/utils/pFileObject/pPlayableFileObjectContainer";

const props = defineProps<{
  petaFile: RPetaFile;
  zIndex: number;
}>();
// const nsfwStore = useNSFWStore();
const vPixi = ref<InstanceType<typeof VPIXI>>();
const pFileObjectContent = ref<PFileObjectContent<unknown>>();
const pFileObject = new PFileObject();
const mouseOffset = new Vec2();
const stageRect = ref(new Vec2());
const { systemInfo } = useSystemInfoStore();
let scale = 1;
const position = new Vec2();
const settingsStore = useSettingsStore();
const pointerPosition = new Vec2();
const dragging = ref(false);
let fitToOutside = true;
async function construct() {
  const pixiApp = vPixi.value?.app();
  if (pixiApp === undefined) {
    return;
  }
  pixiApp.stage.addChild(pFileObject);
  pixiApp.stage.interactive = true;
  pixiApp.stage.on("pointerdown", pointerdown);
  window.addEventListener("pointerup", pointerup);
  vPixi.value?.canvasWrapper().addEventListener("wheel", wheel);
  vPixi.value?.canvasWrapper().addEventListener("dblclick", reset);
  pixiApp.stage.on("pointermove", pointermove);
  load();
}
async function load() {
  await pFileObject.load(props.petaFile);
  pFileObjectContent.value = pFileObject.content;
  if (pFileObject.content instanceof PPlayableFileObjectContent) {
    pFileObject.content.setPaused(false);
    pFileObject.content.event.on("updateRenderer", () => {
      vPixi.value?.orderPIXIRender();
    });
  }
  vPixi.value?.orderPIXIRender();
}
function update() {
  pFileObject.scale.set(scale, scale);
  pFileObject.position.set(position.x + stageRect.value.x / 2, position.y + stageRect.value.y / 2);
}
function loseContext() {
  IPC.send("reloadWindow");
}
function resize(rect: PIXIRect) {
  mouseOffset.set(0, 0);
  stageRect.value.set(rect.domRect.width, rect.domRect.height);
  if (fitToOutside) {
    reset();
  }
  constraint();
  update();
  vPixi.value?.orderPIXIRender();
}
function reset() {
  fitToOutside = true;
  scale = defaultScale.value;
  position.x = (-props.petaFile.metadata.width * defaultScale.value) / 2;
  position.y = (-props.petaFile.metadata.height * defaultScale.value) / 2;
  update();
  vPixi.value?.orderPIXIRender();
}
function pointerdown(event: PointerEvent) {
  pointerPosition.set(vec2FromPointerEvent(event));
  dragging.value = true;
}
function pointerup() {
  dragging.value = false;
}
function pointermove(event: PointerEvent) {
  if (!dragging.value) {
    return;
  }
  fitToOutside = false;
  const p = vec2FromPointerEvent(event);
  const vec = p.clone().sub(pointerPosition);
  position.add(vec);
  pointerPosition.set(p);
  constraint();
  update();
  vPixi.value?.orderPIXIRender();
}
function constraint() {
  // 左側がはみ出たら修正
  if (position.x + stageRect.value.x / 2 > 0) {
    position.x = -stageRect.value.x / 2;
  }
  // 右がはみ出たら修正
  if (
    props.petaFile.metadata.width * scale + position.x + stageRect.value.x / 2 - stageRect.value.x <
    0
  ) {
    position.x =
      -props.petaFile.metadata.width * scale - (stageRect.value.x / 2 - stageRect.value.x);
  }
  // 上がはみ出たら修正
  if (position.y + stageRect.value.y / 2 > 0) {
    position.y = -stageRect.value.y / 2;
  }
  // 下がはみ出たら修正
  if (
    props.petaFile.metadata.height * scale +
      position.y +
      stageRect.value.y / 2 -
      stageRect.value.y <
    0
  ) {
    position.y =
      -props.petaFile.metadata.height * scale - (stageRect.value.y / 2 - stageRect.value.y);
  }
  // 左右がはみ出たら中心へ
  if (props.petaFile.metadata.width * scale < stageRect.value.x) {
    position.x = (-props.petaFile.metadata.width * scale) / 2;
  }
  // 上下がはみ出たら中心へ
  if (props.petaFile.metadata.height * scale < stageRect.value.y) {
    position.y = (-props.petaFile.metadata.height * scale) / 2;
  }
}
function wheel(event: WheelEvent) {
  const mouse = vec2FromPointerEvent(event).sub(mouseOffset).sub(stageRect.value.clone().div(2));
  if (event.ctrlKey || systemInfo.value.platform === "win32") {
    const currentZoom = scale;
    scale *= 1 + -event.deltaY * settingsStore.state.value.zoomSensitivity * 0.00001;
    if (scale > BOARD_ZOOM_MAX) {
      scale = BOARD_ZOOM_MAX;
    }
    if (scale < BOARD_ZOOM_MIN) {
      scale = BOARD_ZOOM_MIN;
    }
    position
      .mult(-1)
      .add(mouse)
      .mult(scale / currentZoom)
      .sub(mouse)
      .mult(-1);
  } else {
    position.add(
      new Vec2(event.deltaX, event.deltaY)
        .mult(settingsStore.state.value.moveSensitivity)
        .mult(-0.01),
    );
  }
  fitToOutside = false;
  constraint();
  update();
  vPixi.value?.orderPIXIRender();
}
const pPlayableFileObjectContent = computed(() => {
  if (pFileObjectContent.value instanceof PPlayableFileObjectContent) {
    return pFileObjectContent.value;
  }
  return undefined;
});
const defaultScale = computed(() => {
  let width = 0;
  let height = 0;
  const maxWidth = stageRect.value.x * 1;
  const maxHeight = stageRect.value.y * 1;
  if (props.petaFile.metadata.height / props.petaFile.metadata.width < maxHeight / maxWidth) {
    const size = resizeImage(
      props.petaFile.metadata.width,
      props.petaFile.metadata.height,
      maxWidth,
      "width",
    );
    width = size.width;
    height = size.height;
  } else {
    const size = resizeImage(
      props.petaFile.metadata.width,
      props.petaFile.metadata.height,
      maxHeight,
      "height",
    );
    height = size.height;
    width = size.width;
  }
  height;
  return width / props.petaFile.metadata.width;
});
watch([() => props.petaFile.metadata.width, () => props.petaFile.metadata.height], () => {
  reset();
});
watch(
  () => props.petaFile,
  () => {
    load();
  },
);
</script>

<style lang="scss" scoped>
t-details-root {
  position: relative;
  width: 100%;
  height: 100%;
  display: block;
  background-image: url("~@/@assets/transparentBackground.png");
  overflow: hidden;
  // 1pxだけ右下から出す。
  > t-playback-controller-wrapper {
    position: absolute;
    display: block;
    width: 100%;
    padding: var(--px-3) var(--px-3);
    bottom: 0px;
    > t-playback-controller {
      display: block;
      width: 100%;
    }
  }
}
</style>
