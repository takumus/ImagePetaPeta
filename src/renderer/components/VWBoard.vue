<template>
  <t-root
    :class="{
      dark: darkModeStore.state.value,
    }">
    <t-content>
      <t-top>
        <VTitleBar>
          <VTabBar
            :boards="sortedPetaBoards"
            :current-peta-board-id="currentPetaBoardId"
            @remove="removePetaBoard"
            @add="addPetaBoard"
            @select="selectPetaBoard"
            @update:board="updatePetaBoard" />
        </VTitleBar>
        <VHeaderBar>
          <VBoardProperty
            v-if="currentPetaBoard"
            :board="currentPetaBoard"
            @update="updatePetaBoard" />
        </VHeaderBar>
      </t-top>
      <t-browser>
        <VBoard
          :z-index="1"
          :board="currentPetaBoard"
          ref="vPetaBoard"
          @update:board="updatePetaBoard" />
      </t-browser>
    </t-content>
    <t-modals v-show="components.modal.modalIds.length > 0">
      <VImageImporter @add-panel-by-drag-and-drop="addPanelByDragAndDrop" />
      <VTasks />
    </t-modals>
    <VDialog :z-index="6"></VDialog>
    <VContextMenu :z-index="4" />
  </t-root>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

import VBoard from "@/renderer/components/board/VBoard.vue";
import VBoardProperty from "@/renderer/components/board/VBoardProperty.vue";
import VTabBar from "@/renderer/components/board/VTabBar.vue";
import VHeaderBar from "@/renderer/components/commons/headerBar/VHeaderBar.vue";
import VTitleBar from "@/renderer/components/commons/titleBar/VTitleBar.vue";
import VContextMenu from "@/renderer/components/commons/utils/contextMenu/VContextMenu.vue";
import VDialog from "@/renderer/components/commons/utils/dialog/VDialog.vue";
import VTasks from "@/renderer/components/commons/utils/task/VTasks.vue";
import VImageImporter from "@/renderer/components/importer/VImageImporter.vue";

import { RPetaBoard } from "@/commons/datas/rPetaBoard";
import { createRPetaPanel } from "@/commons/datas/rPetaPanel";
import { UpdateMode } from "@/commons/datas/updateMode";
import {
  BOARD_ADD_MULTIPLE_OFFSET_X,
  BOARD_ADD_MULTIPLE_OFFSET_Y,
  DEFAULT_IMAGE_SIZE,
} from "@/commons/defines";
import { hasPetaFiles } from "@/commons/utils/board";
import { minimizeID } from "@/commons/utils/minimizeID";
import { Vec2 } from "@/commons/utils/vec2";

// import { AnimatedGIFLoader } from "@/renderer/libs/pixi-gif";
import { IPC } from "@/renderer/libs/ipc";
import { logChunk } from "@/renderer/libs/rendererLogger";
import { useAppInfoStore } from "@/renderer/stores/appInfoStore/useAppInfoStore";
import { useComponentsStore } from "@/renderer/stores/componentsStore/useComponentsStore";
import { useDarkModeStore } from "@/renderer/stores/darkModeStore/useDarkModeStore";
import { usePetaBoardsStore } from "@/renderer/stores/petaBoardsStore/usePetaBoardsStore";
import { usePetaFilesStore } from "@/renderer/stores/petaFilesStore/usePetaFilesStore";
import { useStateStore } from "@/renderer/stores/statesStore/useStatesStore";
import { useWindowStatusStore } from "@/renderer/stores/windowStatusStore/useWindowStatusStore";
import { useWindowTitleStore } from "@/renderer/stores/windowTitleStore/useWindowTitleStore";
import { useWindowTypeStore } from "@/renderer/stores/windowTypeStore/useWindowTypeStore";

const statesStore = useStateStore();
const components = useComponentsStore();
const { t } = useI18n();
const darkModeStore = useDarkModeStore();
const windowStatusStore = useWindowStatusStore();
const appInfoStore = useAppInfoStore();
const windowTypeStore = useWindowTypeStore();
const windowTitleStore = useWindowTitleStore();
const petaFilesStore = usePetaFilesStore();
const petaBoardsStore = usePetaBoardsStore();
const vPetaBoard = ref<InstanceType<typeof VBoard>>();
const orderedAddPanelIds = ref<string[]>([]);
const orderedAddPanelDragEvent = ref(new Vec2());
const currentPetaBoardId = ref("");
const errorPetaBoardId = ref("");
onMounted(async () => {
  // AnimatedGIFLoader.add?.();
  petaFilesStore.onUpdate(async (newPetaFiles, mode) => {
    const needReload =
      currentPetaBoard.value === undefined
        ? false
        : hasPetaFiles(currentPetaBoard.value, newPetaFiles);
    if (mode === UpdateMode.INSERT || mode === UpdateMode.REMOVE) {
      if (needReload) {
        const ids = newPetaFiles.map((petaFile) => petaFile.id);
        vPetaBoard.value?.load({
          reload: {
            additions: mode === UpdateMode.INSERT ? ids : [],
            deletions: mode === UpdateMode.REMOVE ? ids : [],
          },
        });
      }
      addOrderedPetaPanels();
    } else if (mode === UpdateMode.UPDATE) {
      vPetaBoard.value?.orderPIXIRender();
    }
  });
  await restoreBoard();
});
async function restoreBoard() {
  const states = await IPC.send("getStates");
  errorPetaBoardId.value =
    states.selectedPetaBoardId != states.loadedPetaBoardId ? states.selectedPetaBoardId : "";
  const lastBoard = petaBoardsStore.state.value[states.selectedPetaBoardId];
  selectPetaBoard(lastBoard);
  if (!lastBoard) {
    selectPetaBoard(sortedPetaBoards.value[0]);
  }
}
function addPanelByDragAndDrop(ids: string[], mouse: Vec2) {
  orderedAddPanelIds.value = ids;
  orderedAddPanelDragEvent.value = mouse;
  addOrderedPetaPanels();
}
function addOrderedPetaPanels() {
  let offsetIndex = 0;
  orderedAddPanelIds.value.forEach((id, i) => {
    const petaFile = petaFilesStore.getPetaFile(id);
    if (!petaFile) return;
    const panel = createRPetaPanel(
      petaFile,
      orderedAddPanelDragEvent.value
        .clone()
        .add(new Vec2(BOARD_ADD_MULTIPLE_OFFSET_X, BOARD_ADD_MULTIPLE_OFFSET_Y).mult(i)),
      DEFAULT_IMAGE_SIZE,
      (petaFile.metadata.height / petaFile.metadata.width) * DEFAULT_IMAGE_SIZE,
    );
    vPetaBoard.value?.addPanel(panel, offsetIndex++);
  });
  if (currentPetaBoard.value && orderedAddPanelIds.value.length > 0) {
    vPetaBoard.value?.load({
      reload: {
        additions: orderedAddPanelIds.value,
        deletions: [],
      },
    });
  }
  orderedAddPanelIds.value = [];
}
async function selectPetaBoard(board: RPetaBoard | undefined) {
  if (!board) {
    return;
  }
  if (currentPetaBoard.value?.id === board.id) {
    return;
  }
  logChunk().log("vIndex", "PetaBoard Selected", minimizeID(board.id));
  statesStore.state.value.selectedPetaBoardId = board.id;
  statesStore.state.value.loadedPetaBoardId = "";
  if (errorPetaBoardId.value === board.id) {
    if (
      (await components.dialog.show(t("boards.selectErrorBoardDialog", [board.name]), [
        t("commons.yes"),
        t("commons.no"),
      ])) != 0
    ) {
      return;
    } else {
      errorPetaBoardId.value = "";
    }
  }
  currentPetaBoardId.value = board.id;
}
async function removePetaBoard(board: RPetaBoard) {
  if (
    (await components.dialog.show(t("boards.removeDialog", [board.name]), [
      t("commons.yes"),
      t("commons.no"),
    ])) != 0
  ) {
    return;
  }
  const index = sortedPetaBoards.value.indexOf(board);
  const rightBoardId = sortedPetaBoards.value[index + 1]?.id || "";
  const leftBoardId = sortedPetaBoards.value[index - 1]?.id || "";
  await petaBoardsStore.removePetaBoard(board);
  selectPetaBoard(
    petaBoardsStore.state.value[rightBoardId] ||
      petaBoardsStore.state.value[leftBoardId] ||
      sortedPetaBoards.value[0],
  );
}
async function addPetaBoard() {
  selectPetaBoard(await petaBoardsStore.addPetaBoard(darkModeStore.state.value));
}
function updatePetaBoard(board: RPetaBoard) {
  petaBoardsStore.savePetaBoard(board);
}
const currentPetaBoard = computed((): RPetaBoard | undefined => {
  if (errorPetaBoardId.value === currentPetaBoardId.value) {
    return undefined;
  }
  return petaBoardsStore.state.value[currentPetaBoardId.value];
});
const sortedPetaBoards = computed(() => {
  return Object.values(petaBoardsStore.state.value).sort((a, b) => {
    return a.index - b.index;
  });
});
watch(
  () => windowStatusStore.state.value.focused,
  () => {
    if (!windowStatusStore.state.value.focused) {
      vPetaBoard.value?.clearSelectionAll(true);
      vPetaBoard.value?.orderPIXIRender();
    }
  },
);
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
    z-index: 3;

    > t-top {
      display: block;
      width: 100%;
      z-index: 2;
    }

    > t-browser {
      display: block;
      overflow: hidden;
      background-color: var(--color-0);
      flex: 1;
      z-index: 1;
    }
  }

  > t-modals {
    position: absolute;
    width: 100%;
    height: 100%;
    top: 0px;
    left: 0px;
    z-index: 4;
  }
}
</style>
<style lang="scss">
@import "@/renderer/styles/index.scss";
</style>
