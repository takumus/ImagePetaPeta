<template>
  <e-progress-bar-root>
    <e-bar
      :style="{
        width: `${progress}%`,
      }">
    </e-bar>
  </e-progress-bar-root>
</template>

<script setup lang="ts">
defineProps<{
  progress: number;
}>();
</script>

<style lang="scss" scoped>
e-progress-bar-root {
  display: block;
  border-radius: var(--rounded);
  background-color: var(--color-font);
  padding: 2px;
  width: 100%;
  height: var(--px-3);
  overflow: hidden;
  > e-bar {
    display: block;
    border-radius: var(--rounded);
    background-color: var(--color-0);
    width: 50%;
    height: 100%;
  }
}
</style>
