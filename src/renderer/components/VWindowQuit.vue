<template>
  <e-root>
    <e-content>
      <e-top>
        <VTitleBar :title="t('titles.quit')" :hide-controls="true"> </VTitleBar>
      </e-top>
      <e-browser> {{ t("quit.quitting") }} </e-browser>
    </e-content>
  </e-root>
</template>

<script setup lang="ts">
import { watch } from "vue";
import { useI18n } from "vue-i18n";

import VTitleBar from "@/renderer/components/commons/titleBar/VTitleBar.vue";

import { useAppInfoStore } from "@/renderer/stores/appInfoStore/useAppInfoStore";
import { useWindowNameStore } from "@/renderer/stores/windowNameStore/useWindowNameStore";
import { useWindowTitleStore } from "@/renderer/stores/windowTitleStore/useWindowTitleStore";

const { t } = useI18n();
const appInfoStore = useAppInfoStore();
const windowNameStore = useWindowNameStore();
const windowTitleStore = useWindowTitleStore();
watch(
  () => `${t(`titles.${windowNameStore.windowName.value}`)} - ${appInfoStore.state.value.name}`,
  (value) => {
    windowTitleStore.windowTitle.value = value;
  },
  { immediate: true },
);
</script>

<style lang="scss" scoped>
e-root {
  > e-content {
    > e-browser {
      display: block;
      overflow-y: auto;
      margin: var(--px-3);
      background-color: var(--color-0);
      flex: 1;
      z-index: 1;
      > e-body {
        display: block;
        white-space: pre-wrap;
        user-select: text;
      }
      > e-buttons {
        display: block;
        text-align: center;
      }
    }
  }
}
</style>
<style lang="scss">
@import "@/renderer/styles/index.scss";
</style>
