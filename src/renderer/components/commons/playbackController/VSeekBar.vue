<template>
  <e-seekbar-root>
    <e-cursor-wrapper ref="root">
      <e-seek>
        <e-cursor
          :style="{
            left: `${cursorPosition}%`,
          }">
        </e-cursor>
      </e-seek>
      <e-loop>
        <e-cursor
          @pointerdown="pointerMove($event, `seek`)"
          :style="{
            left: `${(props.loopStart === 0 && props.loopEnd === 0 ? 0 : props.loopStart / props.duration) * 100}%`,
            width: `${(props.loopStart === 0 && props.loopEnd === 0 ? 1 : (props.loopEnd - props.loopStart) / props.duration) * 100}%`,
          }">
        </e-cursor>
        <!-- start -->
        <e-drag
          @pointerdown="pointerMove($event, `loopStart`)"
          :style="{
            left: `${(props.loopStart === 0 && props.loopEnd === 0 ? 0 : props.loopStart / props.duration) * 100}%`,
          }"
          class="left"></e-drag>
        <!-- end -->
        <e-drag
          @pointerdown="pointerMove($event, `loopEnd`)"
          :style="{
            left: `${((props.loopStart === 0 && props.loopEnd === 0 ? props.duration : props.loopEnd) / props.duration) * 100}%`,
          }"
          class="right"></e-drag>
      </e-loop>
    </e-cursor-wrapper>
  </e-seekbar-root>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";

import { setCursor, setDefaultCursor } from "@/renderer/utils/cursor";

const props = defineProps<{
  duration: number;
  time: number;
  loopStart: number;
  loopEnd: number;
}>();
const emit = defineEmits<{
  (e: "update:time", time: number): void;
  (e: "update:loopStart", time: number): void;
  (e: "update:loopEnd", time: number): void;
  (e: "startSeek"): void;
  (e: "stopSeek"): void;
}>();
const root = ref<HTMLElement>();
const draggingTime = ref(0);
const draggingType = ref<"loopStart" | "loopEnd" | "seek" | "none">("none");
onMounted(() => {
  window.addEventListener("pointerup", pointerMove);
  window.addEventListener("pointermove", pointerMove);
});
function pointerMove(event: PointerEvent, type?: typeof draggingType.value) {
  if (event.type === "pointerdown") {
    if (type !== undefined) {
      draggingType.value = type;
    }
    if (draggingType.value === "loopEnd" || draggingType.value === "loopStart") {
      // setCursor("col-resize");
    }
    if (draggingType.value === "seek") {
      emit("startSeek");
    }
    if (type === "loopStart" && props.loopStart === 0 && props.loopEnd === 0) {
      emit("update:loopEnd", props.duration);
    }
  }
  if (draggingType.value === "none") {
    // setDefaultCursor();
    return;
  }
  if (event.type === "pointerup") {
    if (draggingType.value === "seek") {
      emit("stopSeek");
    }
    draggingType.value = "none";
  }
  const rect = root.value?.getBoundingClientRect();
  if (rect === undefined) {
    return;
  }
  const x = event.clientX - rect.x;
  let time = (x / rect.width) * props.duration;
  if (time < 0) {
    time = 0;
  } else if (time > props.duration) {
    time = props.duration;
  }
  if (draggingType.value === "seek") {
    draggingTime.value = time;
    emit("update:time", draggingTime.value);
  } else if (draggingType.value === "loopStart") {
    if (time > props.loopEnd) {
      time = props.loopEnd;
    }
    emit("update:loopStart", time);
  } else if (draggingType.value === "loopEnd") {
    if (time < props.loopStart) {
      time = props.loopStart;
    }
    emit("update:loopEnd", time);
  }
}
const cursorPosition = computed(() => {
  const time =
    ((draggingType.value === "seek" ? draggingTime.value : props.time) / props.duration) * 100;
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
  border-radius: var(--rounded);
  background-color: var(--color-0);
  padding: var(--px-2) calc(var(--px-2) + calc(var(--px-1) / 2));
  width: 100%;
  height: 32px;
  overflow: hidden;
  > e-cursor-wrapper {
    display: block;
    position: relative;
    width: 100%;
    height: 100%;
    > e-loop {
      display: block;
      position: absolute;
      top: 0px;
      left: 0px;
      // opacity: 0.5;
      z-index: 1;
      width: 100%;
      height: 100%;
      > e-cursor {
        display: block;
        position: relative;
        top: 0px;
        left: 0px;
        opacity: 0.1;
        border-radius: var(--rounded);
        background-color: var(--color-font);
        height: 100%;
      }
      > e-drag {
        display: block;
        position: absolute;
        top: 0px;
        left: 0px;
        border-radius: var(--rounded);
        background-color: var(--color-accent-1);
        width: var(--px-1);
        height: 100%;
        &.left {
          transform: translateX(-100%);
          cursor: e-resize;
        }
        &.right {
          transform: translateX(0%);
          cursor: w-resize;
        }
      }
    }
    > e-seek {
      display: block;
      position: absolute;
      top: 0px;
      left: 0px;
      z-index: 0;
      width: 100%;
      height: 100%;
      > e-cursor {
        display: block;
        position: absolute;
        transform: translateX(-50%);
        border-radius: var(--rounded);
        background-color: var(--color-font);
        width: var(--px-1);
        height: 100%;
      }
    }
  }
}
</style>
