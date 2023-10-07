<template>
  <e-checkbox-root @click="click">
    <e-content :class="{ checked: value }">
      <e-circle> </e-circle>
    </e-content>
  </e-checkbox-root>
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
e-checkbox-root {
  display: inline-block;
  cursor: pointer;
  padding: var(--px-1);
  height: 23px;
  > e-content {
    display: block;
    position: relative;
    border-radius: var(--rounded);
    background-color: var(--color-checkbox-false-background);
    aspect-ratio: 2;
    height: 100%;
    overflow: hidden;
    > e-circle {
      display: block;
      position: relative;
      left: 0%;
      transform: scale(0.7);
      transition-duration: 100ms;
      transition-property: left, background-color;
      box-shadow: 0px 0.5px 2px rgba(0, 0, 0, 0.2);
      border-radius: var(--rounded-circle);
      background-color: var(--color-checkbox-false-circle);
      aspect-ratio: 1;
      height: 100%;
    }
    &.checked {
      background-color: var(--color-checkbox-true-background);
      > e-circle {
        left: 50%;
        background-color: var(--color-checkbox-true-circle);
      }
    }
  }
}
</style>
