<template>
  <e-floating-root
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
  </e-floating-root>
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
  contitions = {
    shrinkWidth: false,
    shrinkHeight: true,
    insideParentElement: false,
  },
  flip = {
    x: true,
    y: true,
  },
) {
  const margin = 10;
  const limits = (() => {
    if (contitions.insideParentElement) {
      const parentRect = rootElement.value?.parentElement?.getBoundingClientRect();
      if (parentRect !== undefined) {
        return {
          right: parentRect.width + parentRect.x - margin,
          left: parentRect.x + margin,
          width: parentRect.width + parentRect.x - parentRect.x - margin * 2,
          bottom: parentRect.height + parentRect.y - margin,
          top: parentRect.y + margin,
        };
      }
    }
    return {
      right: document.body.clientWidth - margin,
      left: margin,
      width: document.body.clientWidth - margin * 2,
      bottom: document.body.clientHeight - margin,
      top: margin,
    };
  })();
  const targetCorners = {
    top: Math.max(limits.top, Math.min(targetRect.y, limits.bottom)),
    bottom: Math.max(limits.top, Math.min(targetRect.y + targetRect.height, limits.bottom)),
    left: Math.max(limits.left, Math.min(targetRect.x, limits.right)),
    right: Math.max(limits.left, Math.min(targetRect.x + targetRect.width, limits.right)),
  };
  position.value.x = targetCorners.left;
  position.value.y = targetCorners.bottom;
  height.value = props.maxHeight;
  width.value = props.maxWidth;
  nextTick(() => {
    const floatingRect = rootElement.value?.getBoundingClientRect();
    if (floatingRect === undefined) {
      return;
    }
    const rightSpace = limits.right - (targetCorners.left + floatingRect.width);
    const leftSpace = targetCorners.left - floatingRect.width - limits.left;
    const bottomSpace = limits.bottom - (targetCorners.bottom + floatingRect.height);
    const topSpace = targetCorners.top - floatingRect.height - limits.top;
    if (rightSpace < 0) {
      if (leftSpace < 0) {
        position.value.x = limits.right - floatingRect.width;
        if (floatingRect.width > limits.width) {
          position.value.x = limits.left;
          width.value = limits.width + "px";
        }
      } else {
        if (flip.x) {
          position.value.x = targetCorners.left - floatingRect.width;
        } else {
          position.value.x = limits.right - floatingRect.width;
        }
      }
    }
    if (bottomSpace < 0) {
      if (topSpace < 0) {
        if (contitions.shrinkHeight) {
          if (bottomSpace > topSpace) {
            height.value = limits.bottom - position.value.y + "px";
          } else {
            position.value.y = limits.top;
            height.value = targetCorners.top - limits.top + "px";
          }
        } else {
          if (bottomSpace > topSpace) {
            position.value.y = limits.bottom - floatingRect.height;
          } else {
            position.value.y = limits.top;
          }
        }
      } else {
        if (flip.y) {
          position.value.y = targetCorners.top - floatingRect.height;
        } else {
          position.value.y = limits.bottom - floatingRect.height;
        }
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
e-floating-root {
  position: fixed;
  background-color: var(--color-0-floating);
  margin: 0px;
  box-shadow: var(--shadow-floating);
  border-radius: var(--rounded);
  top: 0px;
  left: 0px;
  max-width: 256px;
  overflow: hidden;
}
</style>
