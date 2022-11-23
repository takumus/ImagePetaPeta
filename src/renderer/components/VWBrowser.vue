<template>
  <t-root
    :class="{
      dark: darkModeStore.state.value,
    }">
    <t-content>
      <t-top>
        <VTitleBar :title="t('titles.browser')"> </VTitleBar>
        <VUtilsBar> </VUtilsBar>
      </t-top>
      <t-browser>
        <VBrowser />
      </t-browser>
    </t-content>
    <t-modals v-show="components.modal.modalIds.length > 0">
      <VImageImporter />
      <VTasks />
    </t-modals>
    <VDialog :zIndex="6"></VDialog>
    <VContextMenu :zIndex="4" />
  </t-root>
</template>

<script setup lang="ts">
// Vue
import { watch } from "vue";
import { useI18n } from "vue-i18n";

// Components
import VBrowser from "@/renderer/components/browser/VBrowser.vue";
import VImageImporter from "@/renderer/components/importer/VImageImporter.vue";
import VTasks from "@/renderer/components/task/VTasks.vue";
import VTitleBar from "@/renderer/components/top/VTitleBar.vue";
import VUtilsBar from "@/renderer/components/top/VUtilsBar.vue";
import VContextMenu from "@/renderer/components/utils/contextMenu/VContextMenu.vue";
import VDialog from "@/renderer/components/utils/dialog/VDialog.vue";

// Others
import { useAppInfoStore } from "@/renderer/stores/appInfoStore/useAppInfoStore";
import { useComponentsStore } from "@/renderer/stores/componentsStore/useComponentsStore";
import { useDarkModeStore } from "@/renderer/stores/darkModeStore/useDarkModeStore";
import { useWindowTitleStore } from "@/renderer/stores/windowTitleStore/useWindowTitleStore";
import { useWindowTypeStore } from "@/renderer/stores/windowTypeStore/useWindowTypeStore";

const appInfoStore = useAppInfoStore();
const components = useComponentsStore();
const windowTypeStore = useWindowTypeStore();
const windowTitleStore = useWindowTitleStore();
const { t } = useI18n();
const darkModeStore = useDarkModeStore();
watch(
  () => `${t(`titles.${windowTypeStore.windowType.value}`)} - ${appInfoStore.state.value.name}`,
  (value) => {
    windowTitleStore.windowTitle.value = value;
  },
  { immediate: true },
);
</script>

<style lang="scss" scoped>
t-root {
  background-color: var(--color-0);
  color: var(--color-font);
  > t-content {
    position: fixed;
    top: 0px;
    left: 0px;
    display: flex;
    height: 100%;
    width: 100%;
    flex-direction: column;
    > t-top {
      display: block;
      width: 100%;
      z-index: 2;
    }
    > t-browser {
      display: block;
      overflow: hidden;
      padding: var(--px-2);
      background-color: var(--color-0);
      flex: 1;
      z-index: 1;
    }
    > t-modals {
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
