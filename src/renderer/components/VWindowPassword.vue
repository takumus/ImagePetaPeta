<template>
  <form>
    <e-window-root>
      <e-top>
        <VTitleBar :title="''"> </VTitleBar>
      </e-top>
      <e-content>
        <input type="password" v-model="password" />
        <button @click="login">login</button>
        <VCheckbox v-model:value="save" />
      </e-content>
    </e-window-root>
  </form>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";

import VCheckbox from "./commons/utils/checkbox/VCheckbox.vue";
import VTitleBar from "@/renderer/components/commons/titleBar/VTitleBar.vue";

import { IPC } from "@/renderer/libs/ipc";
import { useWindowTitleStore } from "@/renderer/stores/windowTitleStore/useWindowTitleStore";

const { t } = useI18n();
const windowTitleStore = useWindowTitleStore();
const password = ref<string>("");
const save = ref<boolean>(false);
onMounted(async () => {
  windowTitleStore.windowTitle.value = "";
});
function login() {
  IPC.common.login(password.value, save.value);
  // IPC.windows.windowClose();
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
