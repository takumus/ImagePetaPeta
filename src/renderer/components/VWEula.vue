<template>
  <e-root
    :class="{
      dark: darkModeStore.state.value,
    }">
    <e-content>
      <e-top>
        <VTitleBar :title="t('titles.eula')"> </VTitleBar>
      </e-top>
      <e-browser>
        <e-body>{{ t("eula.body") }}</e-body>
        <e-buttons v-if="needToAgree">
          <button @click="agree">{{ t("eula.agree") }}</button>
          <button @click="disagree">{{ t("eula.disagree") }}</button>
        </e-buttons>
        <e-buttons v-else>
          <button @click="close">{{ t("commons.closeButton") }}</button>
        </e-buttons>
      </e-browser>
    </e-content>
    <VDialog :z-index="6"></VDialog>
    <VContextMenu :z-index="4" />
  </e-root>
</template>

<script setup lang="ts">
import { computed, watch } from "vue";
import { useI18n } from "vue-i18n";

import VTitleBar from "@/renderer/components/commons/titleBar/VTitleBar.vue";
import VContextMenu from "@/renderer/components/commons/utils/contextMenu/VContextMenu.vue";
import VDialog from "@/renderer/components/commons/utils/dialog/VDialog.vue";

import { EULA } from "@/commons/defines";

import { IPC } from "@/renderer/libs/ipc";
import { useAppInfoStore } from "@/renderer/stores/appInfoStore/useAppInfoStore";
import { useDarkModeStore } from "@/renderer/stores/darkModeStore/useDarkModeStore";
import { useSettingsStore } from "@/renderer/stores/settingsStore/useSettingsStore";
import { useWindowTitleStore } from "@/renderer/stores/windowTitleStore/useWindowTitleStore";
import { useWindowTypeStore } from "@/renderer/stores/windowTypeStore/useWindowTypeStore";

const { t } = useI18n();
const appInfoStore = useAppInfoStore();
const darkModeStore = useDarkModeStore();
const settings = useSettingsStore();
const windowTypeStore = useWindowTypeStore();
const windowTitleStore = useWindowTitleStore();
function agree() {
  IPC.send("eula", true);
}
function disagree() {
  IPC.send("eula", false);
}
function close() {
  IPC.send("windowClose");
}
const needToAgree = computed(() => {
  return settings.state.value.eula !== EULA;
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
