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
import deepcopy from "deepcopy";
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
  contitions = {
    shrinkWidth: false,
    shrinkHeight: true,
  },
) {
  const margin = 10;
  const rightLimit = document.body.clientWidth - margin;
  const leftLimit = margin;
  const widthLimit = rightLimit - leftLimit;
  const bottomLimit = document.body.clientHeight - margin;
  const topLimit = margin;
  const targetCorners = {
    top: Math.max(topLimit, Math.min(targetRect.y, bottomLimit)),
    bottom: Math.max(topLimit, Math.min(targetRect.y + targetRect.height, bottomLimit)),
    left: Math.max(leftLimit, Math.min(targetRect.x, rightLimit)),
    right: Math.max(leftLimit, Math.min(targetRect.x + targetRect.width, rightLimit)),
  };
  position.value.x = targetCorners.left;
  position.value.y = targetCorners.bottom;
  height.value = props.maxHeight;
  width.value = props.maxWidth;
  nextTick(() => {
    const rect = rootElement.value?.getBoundingClientRect();
    if (rect === undefined) {
      return;
    }
    const rightSpace = rightLimit - (targetCorners.left + rect.width);
    const leftSpace = targetCorners.left - rect.width - leftLimit;
    const bottomSpace = bottomLimit - (targetCorners.bottom + rect.height);
    const topSpace = targetCorners.top - rect.height - topLimit;
    if (rightSpace < 0) {
      if (leftSpace < 0) {
        position.value.x = rightLimit - rect.width;
        if (rect.width > widthLimit) {
          position.value.x = leftLimit;
          width.value = widthLimit + "px";
        }
      } else {
        position.value.x = targetCorners.left - rect.width;
      }
    }
    if (bottomSpace < 0) {
      if (topSpace < 0) {
        if (contitions.shrinkHeight) {
          if (bottomSpace > topSpace) {
            height.value = bottomLimit - position.value.y + "px";
          } else {
            position.value.y = topLimit;
            height.value = targetCorners.top - topLimit + "px";
          }
        } else {
          if (bottomSpace > topSpace) {
            position.value.y = bottomLimit - rect.height;
          } else {
            position.value.y = topLimit;
          }
        }
      } else {
        position.value.y = targetCorners.top - rect.height;
      }
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
