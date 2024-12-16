<template>
  <e-window-root>
    <e-top>
      <VTitleBar :title="''" :hide-controls="true"> </VTitleBar>
    </e-top>
    <e-content>
      <VTasks />
    </e-content>
  </e-window-root>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";

import VTitleBar from "@/renderer/components/commons/titleBar/VTitleBar.vue";
import VTasks from "@/renderer/components/task/VTasks.vue";

import { IPC } from "@/renderer/libs/ipc";
import { useWindowTitleStore } from "@/renderer/stores/windowTitleStore/useWindowTitleStore";

const { t } = useI18n();
const windowTitleStore = useWindowTitleStore();
onMounted(async () => {
  windowTitleStore.windowTitle.value = "";
});
</script>

<style lang="scss" scoped>
e-window-root {
  > e-content {
    display: flex;
    flex-direction: column;
    > e-body {
      display: flex;
      flex: 1;
      justify-content: center;
      align-items: center;
      overflow-y: auto;
      user-select: text;
      text-align: center;
      white-space: pre-wrap;
    }
    > e-buttons {
      display: block;
      padding-bottom: var(--px-2);
      text-align: center;
    }
  }
}
</style>
<style lang="scss">
@use "@/renderer/styles/index.scss" as *;
</style>
