<template>
  <e-window-root>
    <e-top>
      <VTitleBar :title="t('titles.libraries')"> </VTitleBar>
    </e-top>
    <e-content>
      <input type="text" v-model="file" />
      <button @click="openLib">Open</button>
    </e-content>
    <VContextMenu :z-index="4" />
    <VTooltip :z-index="3" />
  </e-window-root>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

import VTitleBar from "@/renderer/components/commons/titleBar/VTitleBar.vue";
import VContextMenu from "@/renderer/components/commons/utils/contextMenu/VContextMenu.vue";
import VTooltip from "@/renderer/components/commons/utils/tooltip/VTooltip.vue";
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
const file = ref("");
onMounted(() => {
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
function openLib() {
  IPC.common.selectLibrary({ path: file.value });
}
</script>

<style lang="scss">
@use "@/renderer/styles/index.scss" as *;
</style>
