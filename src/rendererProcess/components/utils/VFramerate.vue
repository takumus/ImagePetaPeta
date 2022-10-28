<template>
  <t-framerate-root-root> {{ fps }}fps </t-framerate-root-root>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
const fps = ref(999);
let count = 0;
const INTERVAL = 500;
onMounted(() => {
  const update = () => {
    requestAnimationFrame(update);
    count++;
  };
  update();
  setInterval(() => {
    fps.value = count * (1000 / INTERVAL);
    count = 0;
  }, INTERVAL);
});
</script>

<style lang="scss" scoped>
t-framerate-root-root {
  z-index: 999;
  position: fixed;
  right: 0px;
  bottom: 0px;
}
</style>
