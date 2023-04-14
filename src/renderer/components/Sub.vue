<script setup lang="ts">
//
</script>

<template>
  <e-root class="hello">
    <h1>SUB!!!</h1>
    <img src="/vite.svg" />
    <img src="@/renderer/assets/vue.svg" />
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
