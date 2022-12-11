<template>
  <t-floating-root
    class="complement-root"
    ref="rootElement"
    v-show="visible"
    :style="{
      transform: `translate(${position.x}px, ${position.y}px)`,
      maxHeight: height,
      maxWidth: width,
      zIndex: zIndex,
    }">
    <slot></slot>
  </t-floating-root>
</template>

<script setup lang="ts">
import { nextTick, ref } from "vue";

import { Vec2 } from "@/commons/utils/vec2";

const props = defineProps<{
  zIndex: number;
  visible: boolean;
  maxWidth: string;
  maxHeight: string;
}>();
const position = ref(new Vec2(0, 0));
const height = ref(props.maxHeight);
const width = ref(props.maxWidth);
const rootElement = ref<HTMLElement>();
function updateFloating(
  targetRect: { x: number; y: number; width: number; height: number },
  fit = false,
) {
  position.value.x = targetRect.x;
  position.value.y = targetRect.y + targetRect.height;
  height.value = props.maxHeight;
  width.value = props.maxWidth;
  const margin = 10;
  nextTick(() => {
    const rect = rootElement.value?.getBoundingClientRect();
    if (rect === undefined) {
      return;
    }
    const rightSpace = document.body.clientWidth - margin - (targetRect.x + rect.width);
    const leftSpace = targetRect.x - rect.width - margin;
    const bottomSpace = document.body.clientHeight - margin - (targetRect.y + rect.height);
    const topSpace = targetRect.y - rect.height - targetRect.height - margin;
    if (rightSpace < 0) {
      if (leftSpace < 0) {
        position.value.x = document.body.clientWidth - margin - rect.width;
        if (rect.width > document.body.clientWidth - margin) {
          position.value.x = margin;
          width.value = document.body.clientWidth - margin * 2 + "px";
        }
      } else {
        if (fit) {
          position.value.x = document.body.clientWidth - margin - rect.width;
        } else {
          position.value.x = targetRect.x - rect.width;
        }
      }
    }
    if (bottomSpace < 0) {
      if (topSpace < 0) {
        if (position.value.y + rect.height > document.body.clientHeight - margin) {
          height.value = document.body.clientHeight - margin - position.value.y + "px";
        }
      } else {
        if (fit) {
          position.value.y = document.body.clientHeight - margin - rect.height;
        } else {
          position.value.y = targetRect.y - rect.height - targetRect.height;
        }
      }
    }
    if (position.value.x < margin) {
      position.value.x = margin;
    }
    if (position.value.y < margin) {
      position.value.y = margin;
    }
  });
}
defineExpose({
  updateFloating,
  rootElement,
});
</script>

<style lang="scss" scoped>
t-floating-root {
  position: fixed;
  background-color: var(--color-0-floating);
  margin: 0px;
  box-shadow: var(--floating-shadow);
  border-radius: var(--rounded);
  top: 0px;
  left: 0px;
  max-width: 256px;
  overflow: hidden;
}
</style>
