<template>
  <t-drag-view-root ref="detailsRoot">
    <t-img
      :style="{
        transform: `translate(${position.x + stageRect.x / 2}px, ${
          position.y + stageRect.y / 2
        }px) scale(${scale})`,
        width: `${contentWidth}px`,
        height: `${contentHeight}px`,
      }"
    >
      <slot></slot>
    </t-img>
  </t-drag-view-root>
</template>

<script setup lang="ts">
// Vue
import { BOARD_ZOOM_MAX, BOARD_ZOOM_MIN } from "@/commons/defines";
import { resizeImage } from "@/commons/utils/resizeImage";
import { Vec2, vec2FromPointerEvent } from "@/commons/utils/vec2";
import { useResizerStore } from "@/rendererProcess/stores/resizerStore";
import { useSettingsStore } from "@/rendererProcess/stores/settingsStore";
import { useSystemInfoStore } from "@/rendererProcess/stores/systemInfoStore";
import { ref, onMounted, onUnmounted, watch, computed } from "vue";
// Components
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
let moved = false;
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
  if (!moved) {
    reset();
  }
}
function reset() {
  moved = false;
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
  moved = true;
  const p = vec2FromPointerEvent(event);
  const vec = p.clone().sub(pointerPosition);
  position.value.add(vec);
  pointerPosition.set(p);
}
function wheel(event: WheelEvent) {
  const mouse = vec2FromPointerEvent(event).sub(mouseOffset).sub(stageRect.value.clone().div(2));
  if (event.ctrlKey || systemInfo.value.platform === "win32") {
    const currentZoom = scale.value;
    scale.value *= 1 + -event.deltaY * settingsStore.state.value.zoomSensitivity * 0.00001;
    if (scale.value > BOARD_ZOOM_MAX) {
      scale.value = BOARD_ZOOM_MAX;
    } else if (scale.value < BOARD_ZOOM_MIN) {
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
  moved = true;
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
t-drag-view-root {
  position: relative;
  width: 100%;
  height: 100%;
  display: block;
  background-image: url("~@/@assets/transparentBackground.png");
  overflow: hidden;
  > t-img {
    display: block;
    position: absolute;
    transform-origin: top left;
    overflow: hidden;
  }
}
</style>
