<template>
  <t-root
    :class="{
      dark: darkModeStore.state.value,
    }"
  >
    <t-content>
      <t-top>
        <VTitleBar :title="t('titles.settings')"> </VTitleBar>
      </t-top>
      <t-browser>
        <VSettings />
      </t-browser>
    </t-content>
    <VDialog :zIndex="6"></VDialog>
    <VContextMenu :zIndex="4" />
  </t-root>
</template>

<script setup lang="ts">
// Vue
import { onMounted, watch } from "vue";
// Components
import VTitleBar from "@/rendererProcess/components/top/VTitleBar.vue";
import VContextMenu from "@/rendererProcess/components/utils/VContextMenu.vue";
import VSettings from "@/rendererProcess/components/settings/VSettings.vue";
import VDialog from "@/rendererProcess/components/utils/VDialog.vue";
// Others
import { API } from "@/rendererProcess/api";
import { useKeyboardsStore } from "@/rendererProcess/stores/keyboardsStore";
import { useDarkModeStore } from "@/rendererProcess/stores/darkModeStore";
import { useI18n } from "vue-i18n";
import { useWindowTypeStore } from "@/rendererProcess/stores/windowTypeStore";
import { useWindowTitleStore } from "@/rendererProcess/stores/windowTitleStore";
import { useAppInfoStore } from "@/rendererProcess/stores/appInfoStore";
const { t } = useI18n();
const darkModeStore = useDarkModeStore();
const keyboards = useKeyboardsStore();
const windowTypeStore = useWindowTypeStore();
const windowTitleStore = useWindowTitleStore();
const appInfoStore = useAppInfoStore();
onMounted(() => {
  keyboards.enabled = true;
  keyboards.keys("Escape").up(() => {
    API.send("windowClose");
  });
});
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
      padding: var(--px-3);
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
@import "@/rendererProcess/components/index.scss";
</style>
