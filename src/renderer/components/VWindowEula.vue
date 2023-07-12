<template>
  <e-window-root>
    <e-top>
      <VTitleBar :title="t('titles.eula')"> </VTitleBar>
    </e-top>
    <e-content>
      <e-body>{{ t("eula.body") }}</e-body>
      <e-buttons v-if="needToAgree">
        <button @click="agree">{{ t("eula.agree") }}</button>
        <button @click="disagree">{{ t("eula.disagree") }}</button>
      </e-buttons>
      <e-buttons v-else>
        <button @click="close">{{ t("commons.closeButton") }}</button>
      </e-buttons>
    </e-content>
    <VContextMenu :z-index="4" />
    <VTooltip :z-index="3" />
  </e-window-root>
</template>

<script setup lang="ts">
import { computed, watch } from "vue";
import { useI18n } from "vue-i18n";

import VTitleBar from "@/renderer/components/commons/titleBar/VTitleBar.vue";
import VContextMenu from "@/renderer/components/commons/utils/contextMenu/VContextMenu.vue";
import VTooltip from "@/renderer/components/commons/utils/tooltip/VTooltip.vue";

import { EULA } from "@/commons/defines";

import { IPC } from "@/renderer/libs/ipc";
import { useAppInfoStore } from "@/renderer/stores/appInfoStore/useAppInfoStore";
import { useSettingsStore } from "@/renderer/stores/settingsStore/useSettingsStore";
import { useWindowNameStore } from "@/renderer/stores/windowNameStore/useWindowNameStore";
import { useWindowTitleStore } from "@/renderer/stores/windowTitleStore/useWindowTitleStore";

const { t } = useI18n();
const appInfoStore = useAppInfoStore();
const settings = useSettingsStore();
const windowNameStore = useWindowNameStore();
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
</style>
<style lang="scss">
@import "@/renderer/styles/index.scss";
</style>
