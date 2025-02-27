<template>
  <e-window-root>
    <e-top>
      <VTitleBar :title="t('titles.details')"> </VTitleBar>
      <VHeaderBar> </VHeaderBar>
    </e-top>
    <e-content>
      <e-board v-if="petaFile">
        <VDetails :peta-file="petaFile" :z-index="1" />
      </e-board>
      <e-property>
        <VProperty :peta-files="singlePetaFiles" @select-tag="() => {}" />
      </e-property>
    </e-content>
    <VContextMenu :z-index="4" />
    <VTooltip :z-index="3" />
  </e-window-root>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

import VHeaderBar from "@/renderer/components/commons/headerBar/VHeaderBar.vue";
import VProperty from "@/renderer/components/commons/property/VProperty.vue";
import VTitleBar from "@/renderer/components/commons/titleBar/VTitleBar.vue";
import VContextMenu from "@/renderer/components/commons/utils/contextMenu/VContextMenu.vue";
import VTooltip from "@/renderer/components/commons/utils/tooltip/VTooltip.vue";
import VDetails from "@/renderer/components/details/VDetails.vue";

// import { AnimatedGIFLoader } from "@/renderer/libs/pixi-gif";
import { IPC } from "@/renderer/libs/ipc";
import { Keyboards } from "@/renderer/libs/keyboards";
import { useAppInfoStore } from "@/renderer/stores/appInfoStore/useAppInfoStore";
import { useComponentsStore } from "@/renderer/stores/componentsStore/useComponentsStore";
import { usePetaFilesStore } from "@/renderer/stores/petaFilesStore/usePetaFilesStore";
import { useWindowNameStore } from "@/renderer/stores/windowNameStore/useWindowNameStore";
import { useWindowTitleStore } from "@/renderer/stores/windowTitleStore/useWindowTitleStore";

const appInfoStore = useAppInfoStore();
const { t } = useI18n();
const petaFilesStore = usePetaFilesStore();
const windowNameStore = useWindowNameStore();
const windowTitleStore = useWindowTitleStore();
const petaFileId = ref<string>();
const keyboards = new Keyboards();
onMounted(async () => {
  // AnimatedGIFLoader.add?.();
  petaFilesStore.onUpdate(async (newPetaFiles, mode) => {
    // if (mode === "update") {
    //   vPetaBoard.value?.orderPIXIRender();
    // } else if (mode === "remove") {
    //   newPetaFiles.forEach((petaFile) => {
    //     if (!board.value) {
    //       return;
    //     }
    //     Object.values(board.value.petaPanels).forEach((petaPanel) => {
    //       if (petaPanel.petaFileId === petaFile.id) {
    //         IPC.windows.windowClose();
    //       }
    //     });
    //   });
    // }
  });
  IPC.common.on("detailsPetaFile", (event, petaFile) => {
    petaFileId.value = petaFile.id;
  });
  petaFileId.value = (await IPC.details.get())?.id;
  keyboards.enabled = true;
  keyboards.keys("Escape").up(() => {
    IPC.windows.close();
  });
});
const petaFile = computed(() => {
  return petaFilesStore.getPetaFile(petaFileId.value);
});
const singlePetaFiles = computed(() => {
  if (petaFile.value === undefined) {
    return [];
  }
  return [petaFile.value];
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
    display: flex;
    padding: 0px;
    > e-board {
      display: block;
      flex: 1;
      z-index: 1;
      cursor: grab;
      background-image: url("/images/textures/transparent.png");
      background-repeat: repeat;
      overflow: hidden;
    }
    > e-property {
      display: block;
      z-index: 2;
      background-color: var(--color-0);
      padding: var(--px-2);
      width: 300px;
    }
  }
}
</style>
<style lang="scss">
@use "@/renderer/styles/index.scss" as *;
</style>
