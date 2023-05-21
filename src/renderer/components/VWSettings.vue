<template>
  <e-root>
    <e-content>
      <e-top>
        <VTitleBar :title="t('titles.settings')"> </VTitleBar>
      </e-top>
      <e-browser>
        <VSettings />
      </e-browser>
    </e-content>
    <VDialog :z-index="6"></VDialog>
    <VContextMenu :z-index="4" />
  </e-root>
</template>

<script setup lang="ts">
import { onMounted, watch } from "vue";
import { useI18n } from "vue-i18n";

import VTitleBar from "@/renderer/components/commons/titleBar/VTitleBar.vue";
import VContextMenu from "@/renderer/components/commons/utils/contextMenu/VContextMenu.vue";
import VDialog from "@/renderer/components/commons/utils/dialog/VDialog.vue";
import VSettings from "@/renderer/components/settings/VSettings.vue";

import { IPC } from "@/renderer/libs/ipc";
import { useAppInfoStore } from "@/renderer/stores/appInfoStore/useAppInfoStore";
import { useKeyboardsStore } from "@/renderer/stores/keyboardsStore/useKeyboardsStore";
import { useWindowNameStore } from "@/renderer/stores/windowNameStore/useWindowNameStore";
import { useWindowTitleStore } from "@/renderer/stores/windowTitleStore/useWindowTitleStore";

const { t } = useI18n();
const keyboards = useKeyboardsStore();
const windowNameStore = useWindowNameStore();
const windowTitleStore = useWindowTitleStore();
const appInfoStore = useAppInfoStore();
onMounted(() => {
  keyboards.enabled = true;
  keyboards.keys("Escape").up(() => {
    IPC.send("windowClose");
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
      padding: var(--px-3);
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
