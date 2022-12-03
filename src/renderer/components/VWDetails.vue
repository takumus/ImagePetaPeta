<template>
  <t-root
    :class="{
      dark: darkModeStore.state.value,
    }">
    <t-content>
      <t-top>
        <VTitleBar :title="t('titles.details')"> </VTitleBar>
        <VHeaderBar> </VHeaderBar>
      </t-top>
      <t-browser>
        <t-board v-if="petaFile">
          <VDetails :peta-file="petaFile" :z-index="1" />
        </t-board>
        <t-property>
          <VProperty :peta-files="singlePetaFiles" @select-tag="() => {}" />
        </t-property>
      </t-browser>
    </t-content>
    <t-modals v-show="components.modal.modalIds.length > 0">
      <VTasks />
    </t-modals>
    <VDialog :z-index="6"></VDialog>
    <VContextMenu :z-index="4" />
  </t-root>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

import VHeaderBar from "@/renderer/components/commons/headerBar/VHeaderBar.vue";
import VProperty from "@/renderer/components/commons/property/VProperty.vue";
import VTitleBar from "@/renderer/components/commons/titleBar/VTitleBar.vue";
import VContextMenu from "@/renderer/components/commons/utils/contextMenu/VContextMenu.vue";
import VDialog from "@/renderer/components/commons/utils/dialog/VDialog.vue";
import VTasks from "@/renderer/components/commons/utils/task/VTasks.vue";
import VDetails from "@/renderer/components/details/VDetails.vue";

// import { AnimatedGIFLoader } from "@/renderer/libs/pixi-gif";
import { IPC } from "@/renderer/libs/ipc";
import { Keyboards } from "@/renderer/libs/keyboards";
import { useAppInfoStore } from "@/renderer/stores/appInfoStore/useAppInfoStore";
import { useComponentsStore } from "@/renderer/stores/componentsStore/useComponentsStore";
import { useDarkModeStore } from "@/renderer/stores/darkModeStore/useDarkModeStore";
import { usePetaFilesStore } from "@/renderer/stores/petaFilesStore/usePetaFilesStore";
import { useWindowTitleStore } from "@/renderer/stores/windowTitleStore/useWindowTitleStore";
import { useWindowTypeStore } from "@/renderer/stores/windowTypeStore/useWindowTypeStore";

const appInfoStore = useAppInfoStore();
const components = useComponentsStore();
const { t } = useI18n();
const darkModeStore = useDarkModeStore();
const petaFilesStore = usePetaFilesStore();
const windowTypeStore = useWindowTypeStore();
const windowTitleStore = useWindowTitleStore();
const petaFileId = ref<string>();
const keyboards = new Keyboards();
onMounted(async () => {
  // AnimatedGIFLoader.add?.();
  petaFilesStore.onUpdate(async (newPetaFiles, mode) => {
    // if (mode === UpdateMode.UPDATE) {
    //   vPetaBoard.value?.orderPIXIRender();
    // } else if (mode === UpdateMode.REMOVE) {
    //   newPetaFiles.forEach((petaFile) => {
    //     if (!board.value) {
    //       return;
    //     }
    //     Object.values(board.value.petaPanels).forEach((petaPanel) => {
    //       if (petaPanel.petaFileId === petaFile.id) {
    //         IPC.send("windowClose");
    //       }
    //     });
    //   });
    // }
  });
  IPC.on("detailsPetaFile", (event, petaFile) => {
    petaFileId.value = petaFile.id;
  });
  petaFileId.value = (await IPC.send("getDetailsPetaFile"))?.id;
  keyboards.enabled = true;
  keyboards.keys("Escape").up(() => {
    IPC.send("windowClose");
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
      display: flex;
      overflow: hidden;
      background-color: var(--color-0);
      flex: 1;
      z-index: 1;
      > t-board {
        display: block;
        flex: 1;
        z-index: 1;
        overflow: hidden;
        background-repeat: repeat;
        background-image: url("~@/@assets/transparentBackground.png");
        cursor: grab;
      }
      > t-property {
        padding: var(--px-2);
        display: block;
        background-color: var(--color-0);
        z-index: 2;
        width: 300px;
      }
    }
    > t-modals {
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
