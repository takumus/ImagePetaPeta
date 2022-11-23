<template>
  <t-root
    :class="{
      dark: darkModeStore.state.value,
    }">
    <t-content>
      <t-top>
        <VTitleBar :title="t('titles.eula')"> </VTitleBar>
      </t-top>
      <t-browser>
        <t-body>{{ t("eula.body") }}</t-body>
        <t-buttons v-if="needToAgree">
          <button @click="agree">{{ t("eula.agree") }}</button>
          <button @click="disagree">{{ t("eula.disagree") }}</button>
        </t-buttons>
        <t-buttons v-else>
          <button @click="close">{{ t("commons.closeButton") }}</button>
        </t-buttons>
      </t-browser>
    </t-content>
    <VDialog :zIndex="6"></VDialog>
    <VContextMenu :zIndex="4" />
  </t-root>
</template>

<script setup lang="ts">
// Vue
import { computed, watch } from "vue";
import { useI18n } from "vue-i18n";

// Components
import VTitleBar from "@/renderer/components/commons/titleBar/VTitleBar.vue";
import VContextMenu from "@/renderer/components/commons/utils/contextMenu/VContextMenu.vue";
import VDialog from "@/renderer/components/commons/utils/dialog/VDialog.vue";

import { EULA } from "@/commons/defines";

// Others
import { IPC } from "@/renderer/ipc";
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
      overflow-y: auto;
      margin: var(--px-3);
      background-color: var(--color-0);
      flex: 1;
      z-index: 1;
      > t-body {
        display: block;
        white-space: pre-wrap;
        user-select: text;
      }
      > t-buttons {
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
