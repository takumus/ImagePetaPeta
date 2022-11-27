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
// Vue
import { nextTick, ref } from "vue";

// Others
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
function updateFloating(targetRect: { x: number; y: number; width: number; height: number }) {
  position.value.x = targetRect.x;
  position.value.y = targetRect.y + targetRect.height;
  height.value = props.maxHeight;
  width.value = props.maxWidth;
  nextTick(() => {
    const rect = rootElement.value?.getBoundingClientRect();
    if (rect === undefined) {
      return;
    }
    if (rect.right > document.body.clientWidth) {
      if (targetRect.x - rect.width - targetRect.width < 0) {
        width.value = `${document.body.clientWidth - position.value.x}px`;
      } else {
        position.value.x = targetRect.x - rect.width;
      }
    }
    if (rect.bottom > document.body.clientHeight) {
      if (targetRect.y - rect.height - targetRect.height < 0) {
        height.value = `${document.body.clientHeight - position.value.y}px`;
      } else {
        position.value.y = targetRect.y - rect.height - targetRect.height;
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
}
</style>