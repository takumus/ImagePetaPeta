<template>
  <e-tag-cell-root @click="select()" :class="{ selected: selected }">
    <VTextarea
      ref="vTextarea"
      :type="'single'"
      :readonly="readonly"
      :trim="true"
      :value="value"
      :look="look"
      :click-to-edit="clickToEdit"
      @update:value="(name) => updateName(name)" />
  </e-tag-cell-root>
</template>

<script setup lang="ts">
import { ref } from "vue";

import VTextarea from "@/renderer/components/commons/utils/textarea/VTextarea.vue";

const emit = defineEmits<{
  (e: "update:value", value: string): void;
}>();
defineProps<{
  selected: boolean;
  readonly: boolean;
  value?: string;
  look?: string;
  clickToEdit?: boolean;
}>();
const vTextarea = ref<InstanceType<typeof VTextarea>>();
function updateName(name: string) {
  emit("update:value", name);
}
function select() {
  //
}
defineExpose({
  isEditing: () => vTextarea.value?.isEditing() ?? false,
});
</script>

<style lang="scss" scoped>
e-tag-cell-root {
  display: block;
  box-shadow: var(--shadow-small);
  // margin: 0px 0px var(--px-1) var(--px-1);
  border-radius: var(--rounded);
  background-color: var(--color-1);
  padding: var(--px-1);
  width: fit-content;
  &.selected {
    // font-weight: bold;
    // font-size: var(--size-2);
    background-color: var(--color-accent-1);
  }
}
</style>
