<template>
  <e-window-root>
    <button @click="requestPageDownloaderDatas(true)">Download Page (view)</button>
    <button @click="requestPageDownloaderDatas(false)">Download Page (all)</button>
  </e-window-root>
</template>
<script setup lang="ts">
import { sendToBackground } from "$/commons/sendToBackground";
import { onMounted, ref, watch } from "vue";

const enabled = ref(false);
function requestPageDownloaderDatas(inView: boolean) {
  sendToBackground("requestPageDownloaderDatas", inView);
}
onMounted(async () => {
  enabled.value = await sendToBackground("getRightClickEnable");
});
watch(enabled, (value) => {
  sendToBackground("setRightClickEnable", value);
});
</script>
<style lang="scss">
*,
*:before,
*:after {
  box-sizing: border-box;
}
body,
html {
  margin: 0px;
  background-color: var(--color-0);
  padding: 0px;
  min-width: 300px;
  min-height: 300px;
  color: var(--color-font);
  font-size: 12px;
  line-height: 12px;
  font-family: "Helvetica Neue", Arial, "Hiragino Kaku Gothic ProN", "Hiragino Sans", Meiryo,
    sans-serif;
  user-select: none;
}
label {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: var(--size-1);
}
e-window-root {
  display: flex;
  flex-direction: column;
  padding: 8px;
  button {
    width: 128px;
    height: 64px;
  }
}
</style>
<style lang="scss">
@use "@/renderer/styles/index.scss" as *;
</style>
