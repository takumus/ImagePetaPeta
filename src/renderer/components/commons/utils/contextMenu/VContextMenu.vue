<template>
  <VFloating
    :visible="show"
    :z-index="zIndex"
    :max-width="'512px'"
    :max-height="'unset'"
    ref="floating">
    <ul class="context-menu-root" ref="contextMenu">
      <li
        v-for="item in filteredItems"
        :key="item.id"
        @mouseup.left="select(item)"
        :class="{
          item: !item.separate,
          separate: item.separate,
          disabled: item.disabled,
        }">
        {{ item.label }}
      </li>
    </ul>
  </VFloating>
</template>

<script setup lang="ts">
import { v4 as uuid } from "uuid";
import { computed, onMounted, ref } from "vue";

import VFloating from "@/renderer/components/commons/utils/floating/VFloating.vue";

import { Vec2 } from "@/commons/utils/vec2";

import { ContextMenuItem } from "@/renderer/components/commons/utils/contextMenu/contextMenuItem";
import { useComponentsStore } from "@/renderer/stores/componentsStore/useComponentsStore";

defineProps<{
  zIndex: number;
}>();

const contextMenu = ref<HTMLElement>();
const items = ref<ContextMenuItem[]>([]);
const show = ref(false);
const floating = ref<InstanceType<typeof VFloating>>();
onMounted(() => {
  window.addEventListener("pointerdown", (event) => {
    if ((event.target as HTMLElement).parentElement !== contextMenu.value) {
      select();
      return;
    }
  });
});
function open(_items: ContextMenuItem[], _position: Vec2): void {
  if (show.value) {
    select();
  }
  _items.forEach((i) => (i.id = uuid()));
  items.value = _items;
  show.value = true;
  floating.value?.updateFloating({ ..._position, width: 0, height: 0 });
}
function select(item?: ContextMenuItem) {
  if (!show.value) return;
  show.value = false;
  if (item) {
    if (item.click) {
      item.click();
    }
  }
}
const filteredItems = computed(() => {
  return items.value.filter((item) => item.skip !== true);
});
useComponentsStore().contextMenu = {
  open,
};
defineExpose({
  open,
});
</script>

<style lang="scss" scoped>
.context-menu-root {
  margin: 0px;
  border-radius: var(--rounded);
  padding: 0px;
  padding: var(--px-1);
  overflow: hidden;
  color: var(--color-font);
  > .item {
    cursor: pointer;
    border-radius: calc(var(--rounded) / 2);
    padding: var(--px-2) 24px;
    min-width: 128px;
    list-style-type: none;
    word-break: break-word;
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
    margin: var(--px-1) var(--px-2);
    border-bottom: solid var(--px-border) var(--color-font);
    height: 0px;
    overflow: hidden;
  }
}
</style>
