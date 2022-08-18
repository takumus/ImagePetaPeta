<template>
  <t-progress-bar-root>
    <t-bar
      :style="{
        width: `${progress}%`,
      }"
    >
    </t-bar>
  </t-progress-bar-root>
</template>

<script setup lang="ts">
defineProps<{
  progress: number;
}>();
</script>

<style lang="scss" scoped>
t-progress-bar-root {
  background-color: var(--color-font);
  width: 100%;
  height: 16px;
  overflow: hidden;
  border-radius: var(--rounded);
  padding: 2px;
  display: block;
  > t-bar {
    width: 50%;
    height: 100%;
    border-radius: var(--rounded);
    background-color: var(--color-main);
    display: block;
  }
}
</style>
