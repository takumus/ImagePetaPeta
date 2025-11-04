<template>
  <e-window-root>
    <e-top>
      <VTitleBar :title="t('titles.libraries')"> </VTitleBar>
    </e-top>
    <e-content>
      <e-lib v-for="(_, key) in librariesStore.state.value" :key="key">
        <input type="text" v-model="librariesStore.state.value[key].path" />
        <button @click="openLib(librariesStore.state.value[key])">Open</button>
        <button @click="removeLib(librariesStore.state.value[key])">Delete</button>
      </e-lib>
      <e-lib>
        <input type="text" v-model="newLib.path" />
        <button @click="addLib()">Add</button>
      </e-lib>
    </e-content>
    <VContextMenu :z-index="4" />
    <VTooltip :z-index="3" />
  </e-window-root>
</template>

<script setup lang="ts">
import cloneDeep from "lodash.clonedeep";
import { v4 as uuid } from "uuid";
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
const newLib = ref<Libraries[number]>({
  path: "",
  id: uuid(),
});
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
function openLib(lib: Libraries[number]) {
  IPC.common.selectLibrary(lib);
}
function removeLib(lib: Libraries[number]) {
  librariesStore.state.value = librariesStore.state.value.filter((l) => l.id !== lib.id);
}
function addLib() {
  librariesStore.state.value.push(cloneDeep(newLib.value));
  newLib.value = { path: "", id: uuid() };
}
</script>

<style lang="scss">
@use "@/renderer/styles/index.scss" as *;
e-window-root {
  > e-content {
    display: flex;
    flex-direction: column;
    gap: var(--px-1);
    > e-lib {
      display: flex;
      align-items: center;
      gap: var(--px-1);
      > input {
        flex: 1;
      }
    }
  }
}
</style>
