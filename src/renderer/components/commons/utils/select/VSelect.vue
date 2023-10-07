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
  </e-select-root>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";

import VFloating from "@/renderer/components/commons/utils/floating/VFloating.vue";

import { Vec2 } from "@/commons/utils/vec2";

import { SelectItem } from "@/renderer/components/commons/utils/select/selectItem";
import { useComponentsStore } from "@/renderer/stores/componentsStore/useComponentsStore";

const props = defineProps<{
  value: string | number;
  items: SelectItem[];
  minWidth?: string;
}>();
const emit = defineEmits<{
  (e: "update:value", value: string | number): void;
}>();
const button = ref<HTMLElement>();
const components = useComponentsStore();
function open(): void {
  if (button.value === undefined) {
    return;
  }
  const rect = button.value.getBoundingClientRect();
  components.contextMenu.open(
    props.items.map((item) => {
      return {
        click: () => emit("update:value", item.value),
        label: item.label,
      };
    }),
    new Vec2(rect.left, rect.bottom),
  );
}
</script>

<style lang="scss" scoped>
e-select-root {
  display: inline-block;
  > button {
    display: flex;
    align-items: center;
    padding-right: var(--px-1);
    padding-left: var(--px-2);
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
</style>
