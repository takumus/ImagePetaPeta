<template>
  <t-dialog-root
    v-if="visible"
    :style="{
      zIndex: zIndex,
    }">
    <t-modal>
      <t-content>
        <p>
          {{ label }}
        </p>
        <t-buttons>
          <button
            v-for="(item, index) in items"
            :key="item"
            @click="select(index)"
            :ref="(element) => buttonsRef(element as HTMLButtonElement)">
            {{ item }}
          </button>
        </t-buttons>
      </t-content>
    </t-modal>
  </t-dialog-root>
</template>

<script setup lang="ts">
import { nextTick, ref } from "vue";

import { useComponentsStore } from "@/renderer/stores/componentsStore/useComponentsStore";

defineProps<{
  zIndex: number;
}>();

const items = ref<string[]>([]);
const label = ref("");
const visible = ref(false);
const buttons = ref<HTMLButtonElement[]>();
let resolve: (index: number) => void = (index: number) => index;
function select(index: number) {
  resolve(index);
  visible.value = false;
}
function show(_label: string, _items: string[], _defaultItemIndex = 0) {
  if (visible.value) {
    resolve(-1);
  }
  buttons.value = [];
  visible.value = true;
  label.value = _label;
  items.value = _items;
  nextTick(() => {
    buttons.value?.[_defaultItemIndex ?? -1]?.focus();
  });
  return new Promise<number>((res) => {
    resolve = res;
  });
}
function buttonsRef(button: HTMLButtonElement) {
  buttons.value?.push(button);
}
useComponentsStore().dialog = {
  show,
};
defineExpose({
  show,
});
</script>

<style lang="scss" scoped>
t-dialog-root {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0px;
  left: 0px;
  background-color: var(--color-overlay);
  color: var(--color-font);
  overflow: hidden;
  display: block;
  &.no-background {
    background-color: transparent;
  }
  > t-modal {
    background-color: var(--color-0);
    padding: var(--px-3);
    border-radius: var(--rounded);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    > t-content {
      flex: 1;
      overflow: hidden;
      text-align: center;
      display: block;
      > p {
        text-align: center;
        word-break: break-word;
        white-space: pre-wrap;
      }
      > t-buttons {
        display: block;
      }
    }
  }
}
</style>
