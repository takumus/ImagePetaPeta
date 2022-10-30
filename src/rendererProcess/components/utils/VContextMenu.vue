<template>
  <ul
    v-show="show"
    class="context-menu-root"
    ref="contextMenu"
    :style="{
      transform: `translate(${position.x}px, ${position.y}px)`,
      zIndex: zIndex,
    }"
  >
    <li
      v-for="item in filteredItems"
      :key="item.id"
      @click="select(item)"
      :class="{
        item: !item.separate,
        separate: item.separate,
        disabled: item.disabled,
      }"
    >
      {{ item.label }}
    </li>
  </ul>
</template>

<script setup lang="ts">
// Vue
import { ref, onMounted, nextTick, computed } from "vue";

// Others
import { Vec2 } from "@/commons/utils/vec2";
import { v4 as uuid } from "uuid";
import { ContextMenuItem } from "@/rendererProcess/components/utils/contextMenuItem";
import { useComponentsStore } from "@/rendererProcess/stores/componentsStore";
defineProps<{
  zIndex: number;
}>();

const contextMenu = ref<HTMLElement>();
const items = ref<ContextMenuItem[]>([]);
const position = ref(new Vec2(0, 0));
const show = ref(false);
onMounted(() => {
  window.addEventListener("pointerdown", (event) => {
    if ((event.target as HTMLElement).parentElement != contextMenu.value) {
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
  position.value.x = _position.x;
  position.value.y = _position.y;
  items.value = _items;
  show.value = true;
  nextTick(() => {
    const rect = contextMenu.value?.getBoundingClientRect();
    if (rect === undefined) {
      return;
    }
    if (rect.right > document.body.clientWidth) {
      position.value.x = _position.x - rect.width;
    }
    if (rect.bottom > document.body.clientHeight) {
      position.value.y = _position.y - rect.height;
    }
  });
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
  return items.value.filter((item) => item.skip != true);
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
  position: fixed;
  background-color: var(--color-main);
  padding: 0px;
  margin: 0px;
  box-shadow: 1px 1px 5px rgba(0, 0, 0, 0.5);
  color: var(--color-font);
  border-radius: var(--rounded);
  overflow: hidden;
  > .item {
    word-break: break-word;
    list-style-type: none;
    min-width: 128px;
    padding: var(--px1) 24px;
    // padding-left: 24px;
    cursor: pointer;
    &:hover {
      background-color: var(--color-hover);
    }
    > .disabled {
      &:hover {
        background-color: var(--color-main);
      }
    }
  }
  > .separate {
    border-bottom: solid 1px #cccccc;
    margin: var(--px0) var(--px1);
    height: 0px;
    overflow: hidden;
  }
}
</style>
