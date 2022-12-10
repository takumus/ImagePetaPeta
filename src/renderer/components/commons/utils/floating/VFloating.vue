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
  nextTick(() => {
    const rect = rootElement.value?.getBoundingClientRect();
    if (rect === undefined) {
      return;
    }
    if (position.value.x + rect.width > document.body.clientWidth) {
      if (targetRect.x - rect.width > 0 && !fit) {
        position.value.x = targetRect.x - rect.width;
      } else {
        position.value.x = document.body.clientWidth - rect.width;
      }
    }
    if (position.value.y + rect.height > document.body.clientHeight) {
      if (targetRect.y - rect.height - targetRect.height > 0 && !fit) {
        position.value.y = targetRect.y - rect.height - targetRect.height;
      } else {
        position.value.y = document.body.clientHeight - rect.height;
      }
    }
    if (position.value.x < 0) {
      position.value.x = 0;
    }
    if (position.value.y < 0) {
      position.value.y = 0;
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
  // overflow: hidden;
}
</style>
