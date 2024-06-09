<template>
  <e-window-root>
    <e-top>
      <VTitleBar :title="t('titles.details')"> </VTitleBar>
    </e-top>
    <e-content>
      <VPageDownloader />
    </e-content>
    <VContextMenu :z-index="4" />
    <VTooltip :z-index="3" />
  </e-window-root>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

import VTitleBar from "@/renderer/components/commons/titleBar/VTitleBar.vue";
import VContextMenu from "@/renderer/components/commons/utils/contextMenu/VContextMenu.vue";
import VTooltip from "@/renderer/components/commons/utils/tooltip/VTooltip.vue";
import VPageDownloader from "@/renderer/components/pageDownloader/VPageDownloader.vue";

// import { AnimatedGIFLoader } from "@/renderer/libs/pixi-gif";
import { IPC } from "@/renderer/libs/ipc";
import { Keyboards } from "@/renderer/libs/keyboards";
import { useAppInfoStore } from "@/renderer/stores/appInfoStore/useAppInfoStore";
import { useComponentsStore } from "@/renderer/stores/componentsStore/useComponentsStore";
import { useWindowNameStore } from "@/renderer/stores/windowNameStore/useWindowNameStore";
import { useWindowTitleStore } from "@/renderer/stores/windowTitleStore/useWindowTitleStore";

const appInfoStore = useAppInfoStore();
const { t } = useI18n();
const windowNameStore = useWindowNameStore();
const windowTitleStore = useWindowTitleStore();
const keyboards = new Keyboards();
onMounted(async () => {
  keyboards.enabled = true;
  keyboards.keys("Escape").up(() => {
    IPC.windows.close();
  });
});

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
  > e-content {
    display: block;
    flex: 1;
    padding: var(--px-2);
    width: 100%;
    overflow: hidden;
  }
}
</style>
<style lang="scss">
@import "@/renderer/styles/index.scss";
</style>
