<template>
  <e-window-root>
    <e-top>
      <VTitleBar :title="''"> </VTitleBar>
    </e-top>
    <e-content>
      <input type="password" v-model="password" />
      <button @click="login">login</button>
    </e-content>
  </e-window-root>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";

import VTitleBar from "@/renderer/components/commons/titleBar/VTitleBar.vue";

import { IPC } from "@/renderer/libs/ipc";
import { useWindowTitleStore } from "@/renderer/stores/windowTitleStore/useWindowTitleStore";

const { t } = useI18n();
const windowTitleStore = useWindowTitleStore();
const password = ref<string>("");
onMounted(async () => {
  windowTitleStore.windowTitle.value = "";
});
function login() {
  IPC.login(password.value);
  // IPC.windowClose();
}
</script>

<style lang="scss" scoped>
e-window-root {
  > e-content {
    display: flex;
    flex-direction: column;
  }
}
</style>
<style lang="scss">
@import "@/renderer/styles/index.scss";
</style>
