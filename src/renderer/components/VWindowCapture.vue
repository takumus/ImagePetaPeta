<template>
  <e-window-root>
    <e-content>
      <e-top>
        <VTitleBar :title="t('titles.capture')"> </VTitleBar>
        <VHeaderBar> </VHeaderBar>
      </e-top>
      <e-browser>
        <VCapture :z-index="1" />
      </e-browser>
    </e-content>
    <VContextMenu :z-index="4" />
  </e-window-root>
</template>

<script setup lang="ts">
import { watch } from "vue";
import { useI18n } from "vue-i18n";

import VCapture from "@/renderer/components/capture/VCapture.vue";
import VHeaderBar from "@/renderer/components/commons/headerBar/VHeaderBar.vue";
import VTitleBar from "@/renderer/components/commons/titleBar/VTitleBar.vue";
import VContextMenu from "@/renderer/components/commons/utils/contextMenu/VContextMenu.vue";

import { useAppInfoStore } from "@/renderer/stores/appInfoStore/useAppInfoStore";
import { useWindowNameStore } from "@/renderer/stores/windowNameStore/useWindowNameStore";
import { useWindowTitleStore } from "@/renderer/stores/windowTitleStore/useWindowTitleStore";

const { t } = useI18n();
const windowNameStore = useWindowNameStore();
const windowTitleStore = useWindowTitleStore();
const appInfoStore = useAppInfoStore();
watch(
  () => `${t(`titles.${windowNameStore.windowName.value}`)} - ${appInfoStore.state.value.name}`,
  (value) => {
    windowTitleStore.windowTitle.value = value;
  },
  { immediate: true },
);
</script>

<style lang="scss" scoped>
e-window-root {
  background-color: var(--color-0);
  color: var(--color-font);
  > e-content {
    position: fixed;
    top: 0px;
    left: 0px;
    display: flex;
    height: 100%;
    width: 100%;
    flex-direction: column;
    > e-top {
      display: block;
      width: 100%;
      z-index: 2;
    }
    > e-browser {
      display: block;
      overflow: hidden;
      background-color: var(--color-0);
      flex: 1;
      z-index: 1;
    }
  }
}
</style>
<style lang="scss">
@import "@/renderer/styles/index.scss";
</style>
