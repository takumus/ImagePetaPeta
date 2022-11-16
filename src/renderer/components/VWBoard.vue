<template>
  <t-root
    :class="{
      dark: darkModeStore.state.value,
    }"
  >
    <t-content>
      <t-top>
        <VTitleBar>
          <VTabBar
            :boards="sortedPetaBoards"
            :currentPetaBoardId="currentPetaBoardId"
            @remove="removePetaBoard"
            @add="addPetaBoard"
            @select="selectPetaBoard"
            @update:board="updatePetaBoard"
          />
        </VTitleBar>
        <VUtilsBar>
          <VBoardProperty
            v-if="currentPetaBoard"
            :board="currentPetaBoard"
            @update="updatePetaBoard"
          />
        </VUtilsBar>
      </t-top>
      <t-browser>
        <VBoard
          :zIndex="1"
          :board="currentPetaBoard"
          ref="vPetaBoard"
          @update:board="updatePetaBoard"
        />
      </t-browser>
    </t-content>
    <t-modals v-show="components.modal.modalIds.length > 0">
      <VImageImporter @addPanelByDragAndDrop="addPanelByDragAndDrop" />
      <VTasks />
    </t-modals>
    <VDialog :zIndex="6"></VDialog>
    <VContextMenu :zIndex="4" />
    <VFramerate />
  </t-root>
</template>

<script setup lang="ts">
// Vue
import { computed, onMounted, ref, watch } from "vue";
// Components
import VBoard from "@/renderer/components/board/VBoard.vue";
import VImageImporter from "@/renderer/components/importer/VImageImporter.vue";
import VTasks from "@/renderer/components/task/VTasks.vue";
import VTabBar from "@/renderer/components/top/VTabBar.vue";
import VTitleBar from "@/renderer/components/top/VTitleBar.vue";
import VBoardProperty from "@/renderer/components/top/VBoardProperty.vue";
import VUtilsBar from "@/renderer/components/top/VUtilsBar.vue";
import VContextMenu from "@/renderer/components/utils/VContextMenu.vue";
import VDialog from "@/renderer/components/utils/VDialog.vue";
// Others
// import { AnimatedGIFLoader } from "@/renderer/utils/pixi-gif";
import { IPC } from "@/renderer/ipc";
import {
  BOARD_ADD_MULTIPLE_OFFSET_X,
  BOARD_ADD_MULTIPLE_OFFSET_Y,
  DEFAULT_IMAGE_SIZE,
} from "@/commons/defines";
import { PetaBoard } from "@/commons/datas/petaBoard";
import { createPetaPanel } from "@/commons/datas/petaPanel";
import { UpdateMode } from "@/commons/datas/updateMode";
import { Vec2 } from "@/commons/utils/vec2";
import { logChunk } from "@/renderer/utils/rendererLogger";
import { minimId } from "@/commons/utils/utils";
import { useDarkModeStore } from "@/renderer/stores/darkModeStore/useDarkModeStore";
import { useWindowStatusStore } from "@/renderer/stores/windowStatusStore";
import { useStateStore } from "@/renderer/stores/statesStore";
import { useAppInfoStore } from "@/renderer/stores/appInfoStore/useAppInfoStore";
import { useI18n } from "vue-i18n";
import { useComponentsStore } from "@/renderer/stores/componentsStore/useComponentsStore";
import { usePetaImagesStore } from "@/renderer/stores/petaImagesStore";
import { hasPetaImages } from "@/commons/utils/board";
import { usePetaBoardsStore } from "@/renderer/stores/petaBoardsStore";
import VFramerate from "@/renderer/components/utils/VFramerate.vue";
import { useWindowTypeStore } from "@/renderer/stores/windowTypeStore";
import { useWindowTitleStore } from "@/renderer/stores/windowTitleStore";
const statesStore = useStateStore();
const components = useComponentsStore();
const { t } = useI18n();
const darkModeStore = useDarkModeStore();
const windowStatusStore = useWindowStatusStore();
const appInfoStore = useAppInfoStore();
const windowTypeStore = useWindowTypeStore();
const windowTitleStore = useWindowTitleStore();
const petaImagesStore = usePetaImagesStore();
const petaBoardsStore = usePetaBoardsStore();
const vPetaBoard = ref<InstanceType<typeof VBoard>>();
const orderedAddPanelIds = ref<string[]>([]);
const orderedAddPanelDragEvent = ref(new Vec2());
const currentPetaBoardId = ref("");
const errorPetaBoardId = ref("");
onMounted(async () => {
  // AnimatedGIFLoader.add?.();
  petaImagesStore.onUpdate(async (newPetaImages, mode) => {
    const needReload =
      currentPetaBoard.value === undefined
        ? false
        : hasPetaImages(currentPetaBoard.value, newPetaImages);
    if (mode === UpdateMode.INSERT || mode === UpdateMode.REMOVE) {
      if (needReload) {
        const ids = newPetaImages.map((petaImage) => petaImage.id);
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
    const petaImage = petaImagesStore.getPetaImage(id);
    if (!petaImage) return;
    const panel = createPetaPanel(
      petaImage,
      orderedAddPanelDragEvent.value
        .clone()
        .add(new Vec2(BOARD_ADD_MULTIPLE_OFFSET_X, BOARD_ADD_MULTIPLE_OFFSET_Y).mult(i)),
      DEFAULT_IMAGE_SIZE,
      (petaImage.height / petaImage.width) * DEFAULT_IMAGE_SIZE,
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
async function selectPetaBoard(board: PetaBoard | undefined) {
  if (!board) {
    return;
  }
  if (currentPetaBoard.value?.id === board.id) {
    return;
  }
  logChunk().log("vIndex", "PetaBoard Selected", minimId(board.id));
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
async function removePetaBoard(board: PetaBoard) {
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
function updatePetaBoard(board: PetaBoard) {
  petaBoardsStore.savePetaBoard(board);
}
const currentPetaBoard = computed((): PetaBoard | undefined => {
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
