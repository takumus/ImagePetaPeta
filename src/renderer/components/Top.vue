<script setup lang="ts">
import { common } from "@/commons/common";

import MyWorker from "@/renderer/worker.!ww";

const w = new MyWorker();
w.addEventListener("message", (e) => {
  console.log(e.data);
});
setInterval(() => {
  console.log("send");
  w.postMessage({ msg: "0123456789" });
}, 1000);
common();
</script>

<template>
  <e-root class="hello">
    <h1>TOP!!!</h1>
    <img src="/vite.svg" />
    <img src="@/renderer/assets/electron.svg" />
  </e-root>
</template>

<style lang="scss">
e-root {
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: center;
  h1 {
    font-weight: bold;
    font-size: 3em;
  }
  img {
    width: 200px;
  }
}
</style>
