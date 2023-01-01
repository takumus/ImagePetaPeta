<template>
  <t-slider-root @click="click">
    <t-content :class="{ checked: value }" @pointerdown.left="startDrag" ref="bar">
      <t-circle :style="{ left: positionX + '%' }"> </t-circle>
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
const emitThrottle = throttle(20, (value: number) => {
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
  width: 128px;
  padding: var(--px-1);
  margin: var(--px-2);
  cursor: pointer;
  > t-content {
    display: block;
    height: 100%;
    width: 100%;
    border-radius: 999px;
    position: relative;
    background-color: var(--color-checkbox-false-background);
    // overflow: hidden;
    > t-circle {
      display: block;
      border-radius: 999px;
      background-color: var(--color-checkbox-false-circle);
      height: 100%;
      aspect-ratio: 1;
      transform: translateX(-50%) scale(1.9);
      left: 0%;
      transform-origin: center;
      position: relative;
      box-shadow: 0px 0.5px 2px rgba(0, 0, 0, 0.3);
    }
    &.checked {
      background-color: var(--color-checkbox-true-background);
      > t-circle {
        background-color: var(--color-checkbox-true-circle);
      }
    }
  }
}
</style>
