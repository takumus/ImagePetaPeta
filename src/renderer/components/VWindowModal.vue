<template>
  <e-window-root>
    <e-top>
      <VTitleBar :title="''" :hide-controls="true"> </VTitleBar>
    </e-top>
    <e-content v-if="modalData">
      <e-body>
        {{ modalData.label }}
      </e-body>
      <e-buttons>
        <button v-for="(item, index) in modalData.items" @click="select(index)">
          {{ item }}
        </button>
      </e-buttons>
    </e-content>
  </e-window-root>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";

import VTitleBar from "@/renderer/components/commons/titleBar/VTitleBar.vue";

import { IPC } from "@/renderer/libs/ipc";
import { useWindowTitleStore } from "@/renderer/stores/windowTitleStore/useWindowTitleStore";

const { t } = useI18n();
const windowTitleStore = useWindowTitleStore();
const modalDatas = ref<{ id: string; label: string; items: string[] }[]>([]);
onMounted(async () => {
  windowTitleStore.windowTitle.value = "";
  modalDatas.value = await IPC.modals.getAll();
  IPC.modals.on("update", async () => {
    modalDatas.value = await IPC.modals.getAll();
  });
});
const modalData = computed(() => {
  return modalDatas.value[0];
});
async function select(index: number) {
  if (modalData.value === undefined) {
    return;
  }
  await IPC.modals.select(modalData.value.id, index);
}
</script>

<style lang="scss" scoped>
e-window-root {
  > e-content {
    display: flex;
    flex-direction: column;
    > e-body {
      display: flex;
      flex: 1;
      justify-content: center;
      align-items: center;
      overflow-y: auto;
      user-select: text;
      text-align: center;
      white-space: pre-wrap;
    }
    > e-buttons {
      display: block;
      padding-bottom: var(--px-2);
      text-align: center;
    }
  }
}
</style>
<style lang="scss">
@import "@/renderer/styles/index.scss";
</style>
