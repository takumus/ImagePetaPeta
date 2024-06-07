<template>
  <e-selectable-box-root ref="root">
    <e-images
      :class="{
        selected,
      }">
      <e-content
        :style="{
          transform: `translate(${position.left * 100}%, ${position.top * 100}%) scale(${position.scale * 100}%)`,
        }">
        <slot name="content"></slot>
      </e-content>
      <e-background> </e-background>
    </e-images>
    <e-inners
      :class="{
        selected,
      }">
      <slot name="inner"></slot>
    </e-inners>
    <e-selected v-show="selected"> </e-selected>
  </e-selectable-box-root>
</template>

<script setup lang="ts">
import { useMouseInElement, useRafFn } from "@vueuse/core";
import { ref, watch } from "vue";

const root = ref<HTMLElement>();
const mouse = useMouseInElement(root, { handleOutside: false });
const animateHandler = useRafFn(animate);
const props = defineProps<{
  selected: boolean;
  zoom?: boolean;
}>();
const position = ref({
  left: 0,
  top: 0,
  scale: 1,
});
const zoomRatio = 1.1;
function animate(param: { delta: number }) {
  const speed = param.delta / 150;
  const targetPosition: typeof position.value = {
    left: 0,
    top: 0,
    scale: 1,
  };
  if (!mouse.isOutside.value) {
    targetPosition.left =
      -(mouse.elementX.value / mouse.elementWidth.value - 0.5) * (zoomRatio - 1);
    targetPosition.top =
      -(mouse.elementY.value / mouse.elementHeight.value - 0.5) * (zoomRatio - 1);
    targetPosition.scale = zoomRatio;
  }
  if (
    Math.abs(position.value.left - targetPosition.left) < 0.001 &&
    Math.abs(position.value.top - targetPosition.top) < 0.001 &&
    Math.abs(position.value.scale - targetPosition.scale) < 0.001
  ) {
    position.value = targetPosition;
  } else {
    position.value = {
      left: position.value.left + (targetPosition.left - position.value.left) * speed,
      top: position.value.top + (targetPosition.top - position.value.top) * speed,
      scale: position.value.scale + (targetPosition.scale - position.value.scale) * speed,
    };
  }
}
watch(
  () => props.zoom,
  () => {
    if (props.zoom) {
      animateHandler.resume();
    } else {
      animateHandler.pause();
    }
  },
  { immediate: true },
);
</script>

<style lang="scss" scoped>
e-selectable-box-root {
  display: block;
  position: relative;
  box-shadow: 1px 1px 5px rgba(0, 0, 0, 0.5);
  border-radius: var(--rounded);
  width: 100%;
  height: 100%;
  overflow: hidden;
  > e-images {
    display: block;
    position: relative;
    // filter: brightness(0.7);
    cursor: pointer;
    border-radius: var(--rounded);
    width: 100%;
    height: 100%;
    overflow: hidden;
    &.selected {
      // filter: brightness(1);
      padding: 2px;
    }
    > e-background {
      display: block;
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 0;
      border-radius: var(--rounded);
      background-image: url("/images/textures/transparent.png");
      background-repeat: repeat;
      width: calc(100% - 2px);
      height: calc(100% - 2px);
    }
    > e-content {
      display: block;
      position: absolute;
      top: 0px;
      left: 0px;
      transform: translate(0%, 0%);
      // transform-origin: 0% 0%;
      z-index: 1;
      // transition: transform 0.1s;
      width: 100%;
      height: 100%;
    }
  }
  // &:hover {
  //   box-shadow: 1px 1px 5px rgba(0, 0, 0, 0.5);
  //   > e-images > e-content {
  //     filter: brightness(1);
  //     transform: scale(1.03) translate(-50%, -50%);
  //   }
  // }
  > e-inners {
    display: block;
    position: absolute;
    top: 0px;
    left: 0px;
    z-index: 1;
    border: solid var(--px-1) transparent;
    width: 100%;
    height: 100%;
    pointer-events: none;
    &.selected {
      border: solid var(--px-2) transparent;
    }
  }
  > e-selected {
    display: block;
    position: absolute;
    right: 0px;
    bottom: 0px;
    z-index: 2;
    box-shadow: var(--shadow) inset;
    border-radius: var(--rounded);
    width: 100%;
    height: 100%;
    pointer-events: none;
    &:before {
      position: absolute;
      box-shadow: 0px 0px 0px calc(var(--px-1) * 0.5 - 0.4px) var(--color-font) inset;
      border: solid calc(var(--px-1)) var(--color-0);
      border-radius: var(--rounded);
      width: 100%;
      height: 100%;
      content: "";
    }
    &:after {
      position: absolute;
      border: solid calc(var(--px-1) * 0.5) var(--color-font);
      border-radius: var(--rounded);
      width: 100%;
      height: 100%;
      content: "";
    }
  }
}
</style>
