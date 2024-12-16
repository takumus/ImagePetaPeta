<template>
  <e-window-root>
    <e-top>
      <VTitleBar :title="t('titles.browser')"> </VTitleBar>
      <VHeaderBar> </VHeaderBar>
    </e-top>
    <e-content>
      <VBrowser />
    </e-content>
    <VContextMenu :z-index="4" />
    <VTooltip :z-index="3" />
  </e-window-root>
</template>

<script setup lang="ts">
import { watch } from "vue";
import { useI18n } from "vue-i18n";

import VBrowser from "@/renderer/components/browser/VBrowser.vue";
import VHeaderBar from "@/renderer/components/commons/headerBar/VHeaderBar.vue";
import VTitleBar from "@/renderer/components/commons/titleBar/VTitleBar.vue";
import VContextMenu from "@/renderer/components/commons/utils/contextMenu/VContextMenu.vue";
import VTooltip from "@/renderer/components/commons/utils/tooltip/VTooltip.vue";

import { useAppInfoStore } from "@/renderer/stores/appInfoStore/useAppInfoStore";
import { useImageImporterStore } from "@/renderer/stores/imageImporterStore/useImageImporterStore";
import { useWindowNameStore } from "@/renderer/stores/windowNameStore/useWindowNameStore";
import { useWindowTitleStore } from "@/renderer/stores/windowTitleStore/useWindowTitleStore";

const appInfoStore = useAppInfoStore();
const windowNameStore = useWindowNameStore();
const windowTitleStore = useWindowTitleStore();
useImageImporterStore();
const { t } = useI18n();
watch(
  () => `${t(`titles.${windowNameStore.windowName.value}`)} - ${appInfoStore.state.value.name}`,
  (value) => {
    windowTitleStore.windowTitle.value = value;
  },
  { immediate: true },
);
</script>

<style lang="scss">
@use "@/renderer/styles/index.scss" as *;
</style>
