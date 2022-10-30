<template>
  <t-framerate-root v-if="settingsStore.state.value.showFPS"> {{ fps }}fps </t-framerate-root>
</template>

<script setup lang="ts">
import { useSettingsStore } from "@/rendererProcess/stores/settingsStore";
import { onMounted, ref } from "vue";
const fps = ref(999);
const settingsStore = useSettingsStore();
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
t-framerate-root {
  z-index: 999;
  position: fixed;
  left: 0px;
  bottom: 0px;
  margin: var(--px1);
}
</style>
