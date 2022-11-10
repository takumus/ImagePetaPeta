<template>
  <t-root
    :class="{
      dark: darkModeStore.state.value,
    }"
  >
    <t-content>
      <t-top>
        <VTitleBar :title="t('titles.capture')"> </VTitleBar>
        <VUtilsBar> </VUtilsBar>
      </t-top>
      <t-browser>
        <VCapture :z-index="1" />
      </t-browser>
    </t-content>
    <VDialog :zIndex="6"></VDialog>
    <VContextMenu :zIndex="4" />
  </t-root>
</template>

<script setup lang="ts">
// Vue
import { watch } from "vue";
// Components
import VTitleBar from "@/rendererProcess/components/top/VTitleBar.vue";
import VContextMenu from "@/rendererProcess/components/utils/VContextMenu.vue";
import VDialog from "@/rendererProcess/components/utils/VDialog.vue";
import VUtilsBar from "@/rendererProcess/components/top/VUtilsBar.vue";
import VCapture from "@/rendererProcess/components/capture/VCapture.vue";
// Others
import { useAppInfoStore } from "@/rendererProcess/stores/appInfoStore";
import { useDarkModeStore } from "@/rendererProcess/stores/darkModeStore";
import { useWindowTypeStore } from "@/rendererProcess/stores/windowTypeStore";
import { useWindowTitleStore } from "@/rendererProcess/stores/windowTitleStore";
import { useI18n } from "vue-i18n";
const { t } = useI18n();
const darkModeStore = useDarkModeStore();
const windowTypeStore = useWindowTypeStore();
const windowTitleStore = useWindowTitleStore();
const appInfoStore = useAppInfoStore();
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
      background-color: var(--color-0);
      flex: 1;
      z-index: 1;
    }
  }
}
</style>
<style lang="scss">
@import "@/rendererProcess/styles/index.scss";
</style>
