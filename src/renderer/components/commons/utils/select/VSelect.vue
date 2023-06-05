<template>
  <e-select-root>
    <button
      @click="open"
      ref="button"
      :style="{
        minWidth: minWidth ?? 'unset',
      }"
      tabindex="-1">
      <e-label>{{ items.find((v) => v.value === value)?.label ?? "" }}</e-label>
      <e-icon></e-icon>
    </button>
    <VFloating
      :visible="show"
      :z-index="999"
      :max-width="'512px'"
      :max-height="'unset'"
      ref="floating">
      <ul class="select-root" ref="contextMenu">
        <li class="item" v-for="item in items" :key="item.value" @mouseup.left="select(item)">
          {{ item.label }}
        </li>
      </ul>
    </VFloating>
  </e-select-root>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";

import VFloating from "@/renderer/components/commons/utils/floating/VFloating.vue";

import { SelectItem } from "@/renderer/components/commons/utils/select/selectItem";

defineProps<{
  value: string | number;
  items: SelectItem[];
  minWidth?: string;
}>();
const emit = defineEmits<{
  (e: "update:value", value: string | number): void;
}>();
const contextMenu = ref<HTMLElement>();
const show = ref(false);
const floating = ref<InstanceType<typeof VFloating>>();
const button = ref<HTMLElement>();
onMounted(() => {
  window.addEventListener("pointerdown", (event) => {
    if ((event.target as HTMLElement).parentElement !== contextMenu.value) {
      show.value = false;
      return;
    }
  });
});
function open(): void {
  if (show.value) {
    show.value = false;
    return;
  }
  if (button.value === undefined) {
    return;
  }
  const rect = button.value.getBoundingClientRect();
  show.value = true;
  floating.value?.updateFloating(rect);
}
function select(item: SelectItem) {
  if (!show.value) return;
  show.value = false;
  console.log(show.value);
  emit("update:value", item.value);
}
</script>

<style lang="scss" scoped>
e-select-root {
  display: inline-block;
  > button {
    display: flex;
    align-items: center;
    padding-left: var(--px-2);
    padding-right: var(--px-1);
    > e-label {
      display: block;
      flex: 1;
      flex-grow: 1;
      text-align: left;
    }
    > e-icon {
      display: block;
      margin: var(--px-0);
      margin-left: var(--px-2);
      border-top: var(--px-1) solid var(--color-font);
      border-right: var(--px-1) solid transparent;
      border-left: var(--px-1) solid transparent;
    }
  }
}
.select-root {
  padding: 0px;
  margin: 0px;
  color: var(--color-font);
  border-radius: var(--rounded);
  overflow: hidden;
  > .item {
    word-break: break-word;
    list-style-type: none;
    min-width: 128px;
    padding: var(--px-2) 24px;
    // padding-left: 24px;
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
