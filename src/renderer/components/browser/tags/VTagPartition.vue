<template>
  <e-tag-partition-root>
    <e-content>
      <e-border /><e-label
        ><VTextarea
          ref="vTextarea"
          :type="'single'"
          :readonly="readonly"
          :trim="true"
          :value="value"
          :look="look"
          :click-to-edit="clickToEdit"
          @update:value="(name) => updateName(name)" /></e-label
      ><e-border
    /></e-content>
  </e-tag-partition-root>
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
// function select() {
//   //
// }
defineExpose({
  isEditing: () => vTextarea.value?.isEditing() ?? false,
});
</script>
<style lang="scss" scoped>
e-tag-partition-root {
  display: flex;
  align-items: center;
  cursor: pointer;
  border-radius: var(--rounded);
  background-color: var(--color-0);
  width: 100%;
  height: var(--px-4);
  > e-content {
    display: flex;
    // background-color: var(--color-border);
    // height: var(--px-1);
    align-items: center;
    width: 100%;
    > e-label {
      padding: var(--px-2);
      text-align: center;
    }
    > e-border {
      display: block;
      flex: 1;
      // border-radius: 999px;
      border-bottom: solid var(--px-border) var(--color-border);
      height: 0px;
    }
  }
}
</style>
