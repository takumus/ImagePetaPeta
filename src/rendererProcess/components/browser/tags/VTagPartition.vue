<template>
  <t-tag-partition-root>
    <t-content>
      <t-border /><t-label
        ><VTextarea
          ref="vTextarea"
          :type="'single'"
          :readonly="readonly"
          :trim="true"
          :value="value"
          :look="look"
          :clickToEdit="clickToEdit"
          @update:value="(name) => updateName(name)" /></t-label
      ><t-border
    /></t-content>
  </t-tag-partition-root>
</template>

<script setup lang="ts">
// Vue
import VTextarea from "@/rendererProcess/components/utils/VTextarea.vue";
import { ref } from "vue";
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
t-tag-partition-root {
  display: flex;
  height: var(--px-4);
  width: 100%;
  align-items: center;
  cursor: pointer;
  > t-content {
    display: flex;
    // background-color: var(--color-border);
    // height: var(--px-1);
    align-items: center;
    width: 100%;
    > t-label {
      text-align: center;
      padding: var(--px-2);
    }
    > t-border {
      flex: 1;
      display: block;
      height: var(--px-0);
      border-radius: 999px;
      background-color: var(--color-border);
    }
  }
}
</style>
