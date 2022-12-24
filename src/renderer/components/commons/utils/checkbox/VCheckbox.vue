<template>
  <t-checkbox-root @click="click">
    <t-content :class="{ checked: value }">
      <t-circle> </t-circle>
    </t-content>
  </t-checkbox-root>
</template>

<script setup lang="ts">
const props = defineProps<{
  value: boolean;
}>();
const emit = defineEmits<{
  (e: "update:value", value: boolean): void;
}>();
function click() {
  emit("update:value", !props.value);
}
</script>

<style lang="scss" scoped>
t-checkbox-root {
  display: inline-block;
  height: 26px;
  padding: var(--px-1);
  cursor: pointer;
  > t-content {
    display: block;
    height: 100%;
    aspect-ratio: 2;
    border-radius: 999px;
    position: relative;
    background-color: var(--color-checkbox-false-background);
    overflow: hidden;
    > t-circle {
      display: block;
      border-radius: 999px;
      background-color: var(--color-checkbox-false-circle);
      height: 100%;
      aspect-ratio: 1;
      transform: scale(0.7);
      position: relative;
      transition-duration: 100ms;
      transition-property: left, background-color;
      left: 0%;
      box-shadow: 0px 0.5px 2px rgba(0, 0, 0, 0.2);
    }
    &.checked {
      background-color: var(--color-checkbox-true-background);
      > t-circle {
        left: 50%;
        background-color: var(--color-checkbox-true-circle);
      }
    }
  }
}
</style>
