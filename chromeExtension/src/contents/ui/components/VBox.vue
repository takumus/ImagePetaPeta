<template>
  <e-box-root
    :style="{
      top: rect.y + 'px',
      left: rect.x + 'px',
      width: rect.width + 'px',
      height: rect.height + 'px',
    }"></e-box-root>
</template>
<script setup lang="ts">
defineProps<{
  rect: { x: number; y: number; width: number; height: number };
}>();
</script>
<style lang="scss">
e-box-root {
  position: fixed;
  top: 0px;
  left: 0px;
  z-index: 2147483646;
  margin: 0px;
  box-shadow:
    0px 0px 0px 2px #cccccc,
    0px 0px 0px 2px #cccccc inset,
    0px 0px 4px 3px rgba(0, 0, 0, 0.4),
    0px 0px 4px 3px rgba(0, 0, 0, 0.4) inset;
  border: solid 2px #333333;
  border-radius: var(--rounded);
  padding: 0px;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
</style>
