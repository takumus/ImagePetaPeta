<template>
  <e-drag-view-root ref="detailsRoot">
    <e-img
      :style="{
        transform: `translate(${position.x + stageRect.x / 2}px, ${
          position.y + stageRect.y / 2
        }px) scale(${scale})`,
        width: `${contentWidth}px`,
        height: `${contentHeight}px`,
      }">
      <slot></slot>
    </e-img>
  </e-drag-view-root>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";

import { BOARD_ZOOM_MAX, BOARD_ZOOM_MIN } from "@/commons/defines";
import { resizeImage } from "@/commons/utils/resizeImage";
import { Vec2, vec2FromPointerEvent } from "@/commons/utils/vec2";

import { useResizerStore } from "@/renderer/stores/resizerStore/useResizerStore";
import { useSettingsStore } from "@/renderer/stores/settingsStore/useSettingsStore";
import { useSystemInfoStore } from "@/renderer/stores/systemInfoStore/useSystemInfoStore";

const props = defineProps<{
  contentWidth: number;
  contentHeight: number;
}>();
const detailsRoot = ref<HTMLElement>();
const mouseOffset = new Vec2();
const stageRect = ref(new Vec2());
const { systemInfo } = useSystemInfoStore();
const scale = ref(1);
const position = ref(new Vec2());
const settingsStore = useSettingsStore();
const resizerStore = useResizerStore();
const pointerPosition = new Vec2();
const dragging = ref(false);
let fitToOutside = true;
onMounted(() => {
  detailsRoot.value?.addEventListener("mousewheel", wheel as (e: Event) => void);
  detailsRoot.value?.addEventListener("pointerdown", pointerdown);
  detailsRoot.value?.addEventListener("dblclick", reset);
  window.addEventListener("pointerup", pointerup);
  window.addEventListener("pointermove", pointermove);
  resizerStore.on("resize", resize);
  resizerStore.observe(detailsRoot.value);
  if (detailsRoot.value !== undefined) {
    resize(detailsRoot.value.getBoundingClientRect());
  }
});
onUnmounted(() => {
  detailsRoot.value?.removeEventListener("mousewheel", wheel as (e: Event) => void);
  detailsRoot.value?.removeEventListener("pointerdown", pointerdown);
  window.removeEventListener("pointerup", pointerup);
  window.removeEventListener("pointermove", pointermove);
});
function resize(rect: DOMRect | DOMRectReadOnly) {
  mouseOffset.set(detailsRoot.value?.getBoundingClientRect());
  stageRect.value.set(rect.width, rect.height);
  if (fitToOutside) {
    reset();
  }
  constraint();
}
function reset() {
  fitToOutside = true;
  scale.value = defaultScale.value;
  position.value.x = (-props.contentWidth * defaultScale.value) / 2;
  position.value.y = (-props.contentHeight * defaultScale.value) / 2;
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
  position.value.add(vec);
  pointerPosition.set(p);
  constraint();
}
function constraint() {
  // 左側がはみ出たら修正
  if (position.value.x + stageRect.value.x / 2 > 0) {
    position.value.x = -stageRect.value.x / 2;
  }
  // 右がはみ出たら修正
  if (
    props.contentWidth * scale.value +
      position.value.x +
      stageRect.value.x / 2 -
      stageRect.value.x <
    0
  ) {
    position.value.x =
      -props.contentWidth * scale.value - (stageRect.value.x / 2 - stageRect.value.x);
  }
  // 上がはみ出たら修正
  if (position.value.y + stageRect.value.y / 2 > 0) {
    position.value.y = -stageRect.value.y / 2;
  }
  // 下がはみ出たら修正
  if (
    props.contentHeight * scale.value +
      position.value.y +
      stageRect.value.y / 2 -
      stageRect.value.y <
    0
  ) {
    position.value.y =
      -props.contentHeight * scale.value - (stageRect.value.y / 2 - stageRect.value.y);
  }
  // 左右がはみ出たら中心へ
  if (props.contentWidth * scale.value < stageRect.value.x) {
    position.value.x = (-props.contentWidth * scale.value) / 2;
  }
  // 上下がはみ出たら中心へ
  if (props.contentHeight * scale.value < stageRect.value.y) {
    position.value.y = (-props.contentHeight * scale.value) / 2;
  }
}
function wheel(event: WheelEvent) {
  const mouse = vec2FromPointerEvent(event).sub(mouseOffset).sub(stageRect.value.clone().div(2));
  if (event.ctrlKey || systemInfo.value.platform === "win32") {
    const currentZoom = scale.value;
    scale.value *= 1 + -event.deltaY * settingsStore.state.value.zoomSensitivity * 0.00001;
    if (scale.value > BOARD_ZOOM_MAX) {
      scale.value = BOARD_ZOOM_MAX;
    }
    if (scale.value < BOARD_ZOOM_MIN) {
      scale.value = BOARD_ZOOM_MIN;
    }
    position.value
      .mult(-1)
      .add(mouse)
      .mult(scale.value / currentZoom)
      .sub(mouse)
      .mult(-1);
  } else {
    position.value.add(
      new Vec2(event.deltaX, event.deltaY)
        .mult(settingsStore.state.value.moveSensitivity)
        .mult(-0.01),
    );
  }
  fitToOutside = false;
  constraint();
}
const defaultScale = computed(() => {
  let width = 0;
  let height = 0;
  const maxWidth = stageRect.value.x * 1;
  const maxHeight = stageRect.value.y * 1;
  if (props.contentHeight / props.contentWidth < maxHeight / maxWidth) {
    const size = resizeImage(props.contentWidth, props.contentHeight, maxWidth, "width");
    width = size.width;
    height = size.height;
  } else {
    const size = resizeImage(props.contentWidth, props.contentHeight, maxHeight, "height");
    height = size.height;
    width = size.width;
  }
  height;
  return width / props.contentWidth;
});
watch([() => props.contentWidth, () => props.contentHeight], () => {
  reset();
});
</script>

<style lang="scss" scoped>
e-drag-view-root {
  position: relative;
  width: 100%;
  height: 100%;
  display: block;
  background-image: url("~@/@assets/transparentBackground.png");
  overflow: hidden;
  > e-img {
    display: block;
    position: absolute;
    transform-origin: top left;
    overflow: hidden;
  }
}
</style>
