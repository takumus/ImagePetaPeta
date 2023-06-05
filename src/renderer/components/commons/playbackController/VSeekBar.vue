<template>
  <e-seekbar-root>
    <e-cursor-wrapper @pointerdown="pointerMove" ref="root">
      <e-cursor
        :style="{
          left: `${cursorPosition}%`,
        }"></e-cursor>
    </e-cursor-wrapper>
  </e-seekbar-root>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";

const props = defineProps<{
  duration: number;
  time: number;
}>();
const emit = defineEmits<{
  (e: "update:time", time: number): void;
  (e: "startSeek"): void;
  (e: "stopSeek"): void;
}>();
const root = ref<HTMLElement>();
const dragging = ref(false);
const draggingTime = ref(0);
onMounted(() => {
  window.addEventListener("pointerup", pointerMove);
  window.addEventListener("pointermove", pointerMove);
});
function pointerMove(event: PointerEvent) {
  if (event.type === "pointerdown") {
    dragging.value = true;
    emit("startSeek");
  }
  if (!dragging.value) {
    return;
  }
  if (event.type === "pointerup") {
    dragging.value = false;
    emit("stopSeek");
  }
  const rect = root.value?.getBoundingClientRect();
  if (rect === undefined) {
    return;
  }
  const x = event.clientX - rect.x;
  draggingTime.value = (x / rect.width) * props.duration;
  if (draggingTime.value < 0) {
    draggingTime.value = 0;
  } else if (draggingTime.value > props.duration) {
    draggingTime.value = props.duration;
  }
  emit("update:time", draggingTime.value);
}
const cursorPosition = computed(() => {
  const time = ((dragging.value ? draggingTime.value : props.time) / props.duration) * 100;
  if (time < 0) {
    return 0;
  } else if (time > 100) {
    return 100;
  }
  return time;
});
</script>

<style lang="scss" scoped>
e-seekbar-root {
  display: block;
  position: relative;
  width: 100%;
  height: 32px;
  background-color: var(--color-0);
  border-radius: var(--rounded);
  overflow: hidden;
  padding: var(--px-2) calc(var(--px-2) + calc(var(--px-1) / 2));
  cursor: pointer;
  > e-cursor-wrapper {
    display: block;
    width: 100%;
    height: 100%;
    > e-cursor {
      display: block;
      position: relative;
      width: var(--px-1);
      transform: translateX(-50%);
      height: 100%;
      background-color: var(--color-font);
      border-radius: var(--rounded);
    }
  }
}
</style>
