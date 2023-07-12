<template>
  <VFloating
    :visible="show"
    :z-index="zIndex"
    :max-width="'512px'"
    :max-height="'unset'"
    :disable-pointer-events="true"
    ref="floating">
    <ul class="context-menu-root" ref="contextMenu">
      <li>
        {{ label }}
      </li>
    </ul>
  </VFloating>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";

import VFloating from "@/renderer/components/commons/utils/floating/VFloating.vue";

import { Vec2, vec2FromPointerEvent } from "@/commons/utils/vec2";

import { useComponentsStore } from "@/renderer/stores/componentsStore/useComponentsStore";

defineProps<{
  zIndex: number;
}>();

const contextMenu = ref<HTMLElement>();
const show = ref(false);
const floating = ref<InstanceType<typeof VFloating>>();
const label = ref("WOW");
onMounted(() => {
  // window.addEventListener("pointerdown", (event) => {
  //   if ((event.target as HTMLElement).parentElement !== contextMenu.value) {
  //     select();
  //     return;
  //   }
  // });
});
function open(_label: string, event: PointerEvent): void {
  if (!(event.currentTarget instanceof HTMLElement)) {
    return;
  }
  const targetElement = event.currentTarget;
  function leave() {
    targetElement.removeEventListener("pointerleave", leave);
    show.value = false;
  }
  targetElement.addEventListener("pointerleave", leave);
  label.value = _label;
  show.value = true;
  floating.value?.updateFloating(targetElement.getBoundingClientRect());
}
useComponentsStore().tooltip = {
  open,
};
defineExpose({
  open,
});
</script>

<style lang="scss" scoped>
.context-menu-root {
  padding: 0px;
  margin: 0px;
  color: var(--color-font);
  border-radius: var(--rounded);
  overflow: hidden;
  padding: var(--px-1);
  > .item {
    word-break: break-word;
    list-style-type: none;
    min-width: 128px;
    padding: var(--px-2) 24px;
    border-radius: calc(var(--rounded) / 2);
    cursor: pointer;
    &:hover {
      background-color: var(--color-accent-1);
    }
    > .disabled {
      &:hover {
        background-color: var(--color-1);
      }
    }
  }
  > .separate {
    border-bottom: solid var(--px-border) var(--color-font);
    margin: var(--px-1) var(--px-2);
    height: 0px;
    overflow: hidden;
  }
}
</style>
