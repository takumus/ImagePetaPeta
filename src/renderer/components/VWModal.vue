<template>
  <e-root>
    <e-content>
      <e-top>
        <VTitleBar :title="'modal'" :hide-controls="true"> </VTitleBar>
      </e-top>
      <e-browser v-if="modalData">
        <e-body>{{ modalData.label }}</e-body>
        <e-buttons>
          <button v-for="(item, index) in modalData.items" @click="select(index)">
            {{ item }}
          </button>
        </e-buttons>
      </e-browser>
    </e-content>
    <VDialog :z-index="6"></VDialog>
    <VContextMenu :z-index="4" />
  </e-root>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

import VTitleBar from "@/renderer/components/commons/titleBar/VTitleBar.vue";
import VContextMenu from "@/renderer/components/commons/utils/contextMenu/VContextMenu.vue";
import VDialog from "@/renderer/components/commons/utils/dialog/VDialog.vue";

import { IPC } from "@/renderer/libs/ipc";
import { useAppInfoStore } from "@/renderer/stores/appInfoStore/useAppInfoStore";
import { useSettingsStore } from "@/renderer/stores/settingsStore/useSettingsStore";
import { useWindowNameStore } from "@/renderer/stores/windowNameStore/useWindowNameStore";
import { useWindowTitleStore } from "@/renderer/stores/windowTitleStore/useWindowTitleStore";

const { t } = useI18n();
const appInfoStore = useAppInfoStore();
const windowNameStore = useWindowNameStore();
const windowTitleStore = useWindowTitleStore();
const modalDatas = ref<{ id: string; label: string; items: string[] }[]>([]);
onMounted(async () => {
  modalDatas.value = await IPC.send("getModalDatas");
  IPC.on("updateModalDatas", async () => {
    modalDatas.value = await IPC.send("getModalDatas");
  });
});
const modalData = computed(() => {
  return modalDatas.value[0];
});
async function select(index: number) {
  if (modalData.value === undefined) {
    return;
  }
  await IPC.send("selectModal", modalData.value.id, index);
}
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
