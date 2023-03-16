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
  background-color: var(--color-font);
  width: 100%;
  height: var(--px-3);
  overflow: hidden;
  border-radius: var(--rounded);
  padding: 2px;
  display: block;
  > e-bar {
    width: 50%;
    height: 100%;
    border-radius: var(--rounded);
    background-color: var(--color-0);
    display: block;
  }
}
</style>
