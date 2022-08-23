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
          <VBoardProperty v-if="currentPetaBoard" :board="currentPetaBoard" @update="updatePetaBoard" />
        </VUtilsBar>
      </t-top>
      <t-browser>
        <VBoard
          :zIndex="1"
          :board="currentPetaBoard"
          :detailsMode="false"
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
    <VComplement :zIndex="5" />
  </t-root>
</template>

<script setup lang="ts">
// Vue
import { computed, nextTick, onMounted, ref, watch } from "vue";
// Components
import VBoard from "@/rendererProcess/components/board/VBoard.vue";
import VImageImporter from "@/rendererProcess/components/importer/VImageImporter.vue";
import VTasks from "@/rendererProcess/components/task/VTasks.vue";
import VTabBar from "@/rendererProcess/components/top/VTabBar.vue";
import VTitleBar from "@/rendererProcess/components/top/VTitleBar.vue";
import VBoardProperty from "@/rendererProcess/components/top/VBoardProperty.vue";
import VUtilsBar from "@/rendererProcess/components/top/VUtilsBar.vue";
import VContextMenu from "@/rendererProcess/components/utils/VContextMenu.vue";
import VComplement from "@/rendererProcess/components/utils/VComplement.vue";
import VDialog from "@/rendererProcess/components/utils/VDialog.vue";
// Others
import { AnimatedGIFLoader } from "@/rendererProcess/utils/pixi-gif";
import { API } from "@/rendererProcess/api";
import {
  BOARD_ADD_MULTIPLE_OFFSET_X,
  BOARD_ADD_MULTIPLE_OFFSET_Y,
  DEFAULT_BOARD_NAME,
  DEFAULT_IMAGE_SIZE,
  SAVE_DELAY,
} from "@/commons/defines";
import {
  PetaBoard,
  createPetaBoard,
  dbPetaBoardsToPetaBoards,
  petaBoardsToDBPetaBoards,
} from "@/commons/datas/petaBoard";
import { createPetaPanel } from "@/commons/datas/petaPanel";
import { UpdateMode } from "@/commons/api/interfaces/updateMode";
import { DelayUpdater } from "@/rendererProcess/utils/delayUpdater";
import { Vec2 } from "@/commons/utils/vec2";
import getNameAvoidDuplication from "@/rendererProcess/utils/getNameAvoidDuplication";
import { logChunk } from "@/rendererProcess/utils/rendererLogger";
import { minimId } from "@/commons/utils/utils";
import { useDarkModeStore } from "@/rendererProcess/stores/darkModeStore";
import { useWindowStatusStore } from "@/rendererProcess/stores/windowStatusStore";
import { useStateStore } from "@/rendererProcess/stores/statesStore";
import { useAppInfoStore } from "@/rendererProcess/stores/appInfoStore";
import { useI18n } from "vue-i18n";
import { useComponentsStore } from "@/rendererProcess/stores/componentsStore";
import { usePetaImagesStore } from "@/rendererProcess/stores/petaImagesStore";
import { hasPetaImages } from "@/commons/utils/board";
const statesStore = useStateStore();
const components = useComponentsStore();
const { t } = useI18n();
const darkModeStore = useDarkModeStore();
const windowStatusStore = useWindowStatusStore();
const appInfoStore = useAppInfoStore();
const petaImagesStore = usePetaImagesStore();
const vPetaBoard = ref<InstanceType<typeof VBoard>>();
const boards = ref<{ [petaBoardId: string]: PetaBoard }>({});
const orderedAddPanelIds = ref<string[]>([]);
const orderedAddPanelDragEvent = ref(new Vec2());
const boardUpdaters = ref<{ [key: string]: DelayUpdater<PetaBoard> }>({});
const currentPetaBoardId = ref("");
const errorPetaBoardId = ref("");
onMounted(async () => {
  AnimatedGIFLoader.add?.();
  petaImagesStore.events.on("update", async (newPetaImages, mode) => {
    const needReload =
      currentPetaBoard.value === undefined ? false : hasPetaImages(currentPetaBoard.value, newPetaImages);
    if (mode === UpdateMode.UPSERT || mode === UpdateMode.REMOVE) {
      if (needReload) {
        const ids = newPetaImages.map((petaImage) => petaImage.id);
        vPetaBoard.value?.load({
          reload: {
            additions: mode === UpdateMode.UPSERT ? ids : [],
            deletions: mode === UpdateMode.REMOVE ? ids : [],
          },
        });
      }
      addOrderedPetaPanels();
    } else if (mode === UpdateMode.UPDATE) {
      vPetaBoard.value?.orderPIXIRender();
    }
  });
  document.title = `${t("titles.boards")} - ${appInfoStore.state.value.name} ${appInfoStore.state.value.version}`;
  await getPetaBoards();
  await restoreBoard();
  nextTick(() => {
    API.send("showMainWindow");
  });
});
async function restoreBoard() {
  const states = await API.send("getStates");
  errorPetaBoardId.value = states.selectedPetaBoardId != states.loadedPetaBoardId ? states.selectedPetaBoardId : "";
  const lastBoard = boards.value[states.selectedPetaBoardId];
  selectPetaBoard(lastBoard);
  if (!lastBoard) {
    selectPetaBoard(sortedPetaBoards.value[0]);
  }
}
async function getPetaBoards() {
  boards.value = await API.send("getPetaBoards");
  dbPetaBoardsToPetaBoards(boards.value, false);
  Object.values(boards.value).forEach((board) => {
    let updater = boardUpdaters.value[board.id];
    if (updater) {
      updater.destroy();
    }
    updater = boardUpdaters.value[board.id] = new DelayUpdater<PetaBoard>(SAVE_DELAY);
    updater.initData(board);
    updater.onUpdate((board) => {
      API.send("updatePetaBoards", [petaBoardsToDBPetaBoards(board)], UpdateMode.UPDATE);
    });
  });
}
function addPanelByDragAndDrop(ids: string[], mouse: Vec2, fromBrowser: boolean) {
  orderedAddPanelIds.value = ids;
  orderedAddPanelDragEvent.value = mouse;
  if (fromBrowser) {
    addOrderedPetaPanels();
  }
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
      petaImage.height * DEFAULT_IMAGE_SIZE,
    );
    vPetaBoard.value?.addPanel(panel, offsetIndex);
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
        t("shared.yes"),
        t("shared.no"),
      ])) != 0
    ) {
      return;
    } else {
      errorPetaBoardId.value = "";
    }
  }
  currentPetaBoardId.value = board.id;
}
function savePetaBoard(board: PetaBoard) {
  boardUpdaters.value[board.id]?.order(board);
}
async function removePetaBoard(board: PetaBoard) {
  if ((await components.dialog.show(t("boards.removeDialog", [board.name]), [t("shared.yes"), t("shared.no")])) != 0) {
    return;
  }
  boardUpdaters.value[board.id]?.destroy();
  const index = sortedPetaBoards.value.indexOf(board);
  delete boardUpdaters.value[board.id];
  const rightBoardId = sortedPetaBoards.value[index + 1]?.id || "";
  const leftBoardId = sortedPetaBoards.value[index - 1]?.id || "";
  await API.send("updatePetaBoards", [board], UpdateMode.REMOVE);
  await getPetaBoards();
  selectPetaBoard(boards.value[rightBoardId] || boards.value[leftBoardId] || sortedPetaBoards.value[0]);
}
async function addPetaBoard() {
  const name = getNameAvoidDuplication(
    DEFAULT_BOARD_NAME,
    Object.values(boards.value).map((b) => b.name),
  );
  const board = createPetaBoard(
    name,
    Math.max(...Object.values(boards.value).map((b) => b.index), 0) + 1,
    darkModeStore.state.value,
  );
  await API.send("updatePetaBoards", [board], UpdateMode.UPSERT);
  logChunk().log("vIndex", "PetaBoard Added", minimId(board.id));
  await getPetaBoards();
  selectPetaBoard(board);
}
function updatePetaBoard(board: PetaBoard) {
  if (!board) {
    return;
  }
  boards.value[board.id] = board;
  savePetaBoard(board);
}
const currentPetaBoard = computed((): PetaBoard | undefined => {
  if (errorPetaBoardId.value === currentPetaBoardId.value) {
    return undefined;
  }
  return boards.value[currentPetaBoardId.value];
});
const sortedPetaBoards = computed(() => {
  return Object.values(boards.value).sort((a, b) => {
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
</script>

<style lang="scss" scoped>
t-root {
  background-color: var(--color-main);
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
      background-color: var(--color-main);
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
@import "@/rendererProcess/components/index.scss";
</style>
