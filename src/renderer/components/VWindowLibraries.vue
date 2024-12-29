<template>
  <e-window-root>
    <e-top>
      <VTitleBar :title="t('titles.libraries')"> </VTitleBar>
    </e-top>
    <e-content>
      <e-lib v-for="(_, key) of libraries" :key="key">
        <input type="text" v-model="libraries[key]" />
        <button @click="openLib(libraries[key])">Open</button>
      </e-lib>
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
import VSettings from "@/renderer/components/settings/VSettings.vue";

import { Libraries } from "@/commons/datas/libraries";

import { IPC } from "@/renderer/libs/ipc";
import { useAppInfoStore } from "@/renderer/stores/appInfoStore/useAppInfoStore";
import { useKeyboardsStore } from "@/renderer/stores/keyboardsStore/useKeyboardsStore";
import { useLibrariesStore } from "@/renderer/stores/librariesStore/useLibrariesStore";
import { useWindowNameStore } from "@/renderer/stores/windowNameStore/useWindowNameStore";
import { useWindowTitleStore } from "@/renderer/stores/windowTitleStore/useWindowTitleStore";

const { t } = useI18n();
const librariesStore = useLibrariesStore();
const keyboards = useKeyboardsStore();
const windowNameStore = useWindowNameStore();
const windowTitleStore = useWindowTitleStore();
const appInfoStore = useAppInfoStore();
const file = ref("");
const libraries = computed(() => librariesStore.state.value);
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
function openLib(lib: Libraries[string]) {
  IPC.common.selectLibrary(lib);
}
</script>

<style lang="scss">
@use "@/renderer/styles/index.scss" as *;
</style>
