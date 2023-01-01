<template>
  <t-slider-root @click="click" :style="{ width: width ?? '128px' }">
    <t-content @pointerdown.left="startDrag" ref="bar">
      <t-circle :style="{ left: positionX + '%' }"> </t-circle>
      <t-bar>
        <t-bar-inner :style="{ width: positionX + '%' }"></t-bar-inner>
      </t-bar>
    </t-content>
  </t-slider-root>
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
t-slider-root {
  display: inline-block;
  height: var(--px-3);
  padding: var(--px-1);
  margin: var(--px-1);
  cursor: pointer;
  > t-content {
    display: block;
    height: 100%;
    width: 100%;
    position: relative;
    > t-bar {
      display: block;
      height: 100%;
      width: 100%;
      position: absolute;
      top: 0px;
      left: 0px;
      background-color: var(--color-checkbox-false-background);
      border-radius: 999px;
      overflow: hidden;
      > t-bar-inner {
        display: block;
        height: 100%;
        background-color: var(--color-checkbox-true-background);
      }
    }
    > t-circle {
      z-index: 2;
      display: block;
      border-radius: 999px;
      background-color: var(--color-checkbox-true-circle);
      height: 100%;
      aspect-ratio: 1;
      transform: translateX(-50%) scale(1.9);
      left: 0%;
      transform-origin: center;
      position: relative;
      box-shadow: 0px 0.5px 2px rgba(0, 0, 0, 0.3);
    }
  }
}
</style>
