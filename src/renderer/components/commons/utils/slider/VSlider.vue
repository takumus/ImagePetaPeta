<template>
  <e-slider-root @click="click" @pointerdown.left="startDrag" :style="{ width: width ?? '128px' }">
    <e-content ref="bar">
      <e-circle :style="{ left: positionX + '%' }"> </e-circle>
      <e-bar>
        <e-bar-inner :style="{ width: positionX + '%' }"></e-bar-inner>
      </e-bar>
    </e-content>
  </e-slider-root>
</template>

<script setup lang="ts">
import { throttle } from "throttle-debounce";
import { computed, onMounted, onUnmounted, ref } from "vue";

const props = defineProps<{
  value: number;
  max: number;
  min: number;
  float?: boolean;
  width?: string;
}>();
const emit = defineEmits<{
  (e: "update:value", value: number): void;
  (e: "change", value: number): void;
}>();
const bar = ref<HTMLElement>();
const dragging = ref(false);
const positionX = computed(() => {
  return ((props.value - props.min) / (props.max - props.min)) * 100;
});
const emitThrottle = throttle(1000 / 60, (value: number) => {
  if (dragging.value) {
    emit("update:value", value);
  }
});
onMounted(() => {
  window.addEventListener("pointermove", pointerMove);
  window.addEventListener("pointerup", pointerUp);
});
onUnmounted(() => {
  window.removeEventListener("pointermove", pointerMove);
  window.removeEventListener("pointerup", pointerUp);
});
function click() {
  emit("update:value", props.value);
}
function emitValue(event: PointerEvent, change = false) {
  const rect = bar.value?.getBoundingClientRect();
  if (rect === undefined) {
    return;
  }
  const value = Math.floor(
    Math.min(Math.max((event.clientX - rect.x) / rect.width, 0), 1) * (props.max - props.min) +
      props.min,
  );
  if (isNaN(value) || value < props.min || value > props.max) {
    return;
  }
  emitThrottle(value);
  if (change) {
    emit("change", value);
  }
}
function startDrag(event: PointerEvent) {
  dragging.value = true;
  emitValue(event);
}
function pointerMove(event: PointerEvent) {
  if (!dragging.value) {
    return;
  }
  emitValue(event);
}
function pointerUp(event: PointerEvent) {
  if (dragging.value) {
    emitValue(event, true);
  }
  dragging.value = false;
}
</script>

<style lang="scss" scoped>
e-slider-root {
  display: inline-block;
  cursor: pointer;
  margin: var(--px-1);
  padding: var(--px-1);
  height: var(--px-3);
  > e-content {
    display: block;
    position: relative;
    width: 100%;
    height: 100%;
    > e-bar {
      display: block;
      position: absolute;
      top: 0px;
      left: 0px;
      border-radius: var(--rounded);
      background-color: var(--color-checkbox-false-background);
      width: 100%;
      height: 100%;
      overflow: hidden;
      > e-bar-inner {
        display: block;
        background-color: var(--color-checkbox-true-background);
        height: 100%;
      }
    }
    > e-circle {
      display: block;
      position: relative;
      left: 0%;
      transform: translateX(-50%) scale(1.9);
      transform-origin: center;
      z-index: 2;
      box-shadow: 0px 0.5px 2px rgba(0, 0, 0, 0.3);
      border-radius: var(--rounded-circle);
      background-color: var(--color-checkbox-true-circle);
      aspect-ratio: 1;
      height: 100%;
    }
  }
}
</style>
