<template>
  <t-tag-cell-root @click="select()" :class="{ selected: selected }">
    <VTextarea
      ref="vTextarea"
      :type="'single'"
      :readonly="readonly"
      :trim="true"
      :value="value"
      :look="look"
      :clickToEdit="clickToEdit"
      @update:value="(name) => updateName(name)" />
  </t-tag-cell-root>
</template>

<script setup lang="ts">
// Vue
import { ref } from "vue";

import VTextarea from "@/renderer/components/utils/VTextarea.vue";

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
t-tag-cell-root {
  display: block;
  width: fit-content;
  // margin: 0px 0px var(--px-1) var(--px-1);
  border-radius: var(--rounded);
  padding: var(--px-1);
  background-color: var(--color-1);
  &.selected {
    // font-weight: bold;
    // font-size: var(--size-2);
    background-color: var(--color-accent-1);
  }
}
</style>
