<template>
  <e-root
    :class="{
      dark: darkModeStore.state.value,
    }">
    <e-content>
      <e-top>
        <VTitleBar :title="t('titles.browser')"> </VTitleBar>
        <VHeaderBar> </VHeaderBar>
      </e-top>
      <e-browser>
        <VBrowser />
      </e-browser>
    </e-content>
    <e-modals v-show="components.modal.modalIds.length > 0">
      <VImageImporter />
      <VTasks />
    </e-modals>
    <VDialog :z-index="6"></VDialog>
    <VContextMenu :z-index="4" />
  </e-root>
</template>

<script setup lang="ts">
import { watch } from "vue";
import { useI18n } from "vue-i18n";

import VBrowser from "@/renderer/components/browser/VBrowser.vue";
import VHeaderBar from "@/renderer/components/commons/headerBar/VHeaderBar.vue";
import VTitleBar from "@/renderer/components/commons/titleBar/VTitleBar.vue";
import VContextMenu from "@/renderer/components/commons/utils/contextMenu/VContextMenu.vue";
import VDialog from "@/renderer/components/commons/utils/dialog/VDialog.vue";
import VTasks from "@/renderer/components/commons/utils/task/VTasks.vue";
import VImageImporter from "@/renderer/components/importer/VImageImporter.vue";

import { useAppInfoStore } from "@/renderer/stores/appInfoStore/useAppInfoStore";
import { useComponentsStore } from "@/renderer/stores/componentsStore/useComponentsStore";
import { useDarkModeStore } from "@/renderer/stores/darkModeStore/useDarkModeStore";
import { useWindowNameStore } from "@/renderer/stores/windowNameStore/useWindowNameStore";
import { useWindowTitleStore } from "@/renderer/stores/windowTitleStore/useWindowTitleStore";

const appInfoStore = useAppInfoStore();
const components = useComponentsStore();
const windowNameStore = useWindowNameStore();
const windowTitleStore = useWindowTitleStore();
const { t } = useI18n();
const darkModeStore = useDarkModeStore();
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
      padding: var(--px-2);
      background-color: var(--color-0);
      flex: 1;
      z-index: 1;
    }
    > e-modals {
      position: absolute;
      width: 100%;
      height: 100%;
      top: 0px;
      left: 0px;
      z-index: 3;
    }
  }
}
</style>
<style lang="scss">
@import "@/renderer/styles/index.scss";
</style>
