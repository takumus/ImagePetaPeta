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
    <t-modals v-show="$components.modal.modalIds.length > 0">
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
import { computed, getCurrentInstance, nextTick, onMounted, ref, watch } from "vue";
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
import { dbPetaImagesToPetaImages, dbPetaImageToPetaImage, PetaImages } from "@/commons/datas/petaImage";
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
const _this = getCurrentInstance()!.proxy!;
const darkModeStore = useDarkModeStore();
const windowStatusStore = useWindowStatusStore();
const vPetaBoard = ref<InstanceType<typeof VBoard>>();
const petaImages = ref<PetaImages>({});
const boards = ref<{ [petaBoardId: string]: PetaBoard }>({});
const orderedAddPanelIds = ref<string[]>([]);
const orderedAddPanelDragEvent = ref(new Vec2());
const boardUpdaters = ref<{ [key: string]: DelayUpdater<PetaBoard> }>({});
const currentPetaBoardId = ref("");
const errorPetaBoardId = ref("");
onMounted(async () => {
  AnimatedGIFLoader.add?.();
  API.on("updatePetaImages", async (e, newPetaImages, mode) => {
    if (mode === UpdateMode.UPSERT) {
      let changeCurrentBoard = false;
      newPetaImages.forEach((petaImage) => {
        petaImages.value[petaImage.id] = dbPetaImageToPetaImage(petaImage);
        Object.values(boards.value).forEach((board) => {
          Object.values(board.petaPanels).forEach((petaPanel) => {
            if (petaPanel.petaImageId === petaImage.id) {
              petaPanel._petaImage = petaImages.value[petaImage.id];
            }
          });
        });
        if (currentPetaBoard.value) {
          changeCurrentBoard =
            Object.values(currentPetaBoard.value.petaPanels).filter((petaPanel) => {
              return petaPanel.petaImageId === petaImage.id;
            }).length > 0;
        }
        if (changeCurrentBoard) {
          vPetaBoard.value?.load({
            reload: {
              additions: newPetaImages.map((petaImage) => petaImage.id),
              deletions: [],
            },
          });
        }
      });
      addOrderedPetaPanels();
    } else if (mode === UpdateMode.UPDATE) {
      newPetaImages.forEach((newPetaImage) => {
        const petaImage = petaImages.value[newPetaImage.id];
        if (petaImage) {
          Object.assign(petaImage, dbPetaImageToPetaImage(newPetaImage));
        }
      });
      vPetaBoard.value?.orderPIXIRender();
    } else if (mode === UpdateMode.REMOVE) {
      let changeCurrentBoard = false;
      newPetaImages.forEach((petaImage) => {
        delete petaImages.value[petaImage.id];
        Object.values(boards.value).forEach((board) => {
          Object.values(board.petaPanels).forEach((petaPanel) => {
            if (petaPanel.petaImageId === petaImage.id) {
              petaPanel._petaImage = undefined;
            }
          });
        });
        if (currentPetaBoard.value) {
          changeCurrentBoard =
            Object.values(currentPetaBoard.value.petaPanels).filter((petaPanel) => {
              return petaPanel.petaImageId === petaImage.id;
            }).length > 0;
        }
      });
      if (changeCurrentBoard) {
        vPetaBoard.value?.load({
          reload: {
            additions: [],
            deletions: newPetaImages.map((petaImage) => petaImage.id),
          },
        });
      }
    }
  });
  document.title = `${_this.$t("titles.boards")} - ${_this.$appInfo.name} ${_this.$appInfo.version}`;
  await getPetaImages();
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
async function getPetaImages() {
  petaImages.value = dbPetaImagesToPetaImages(await API.send("getPetaImages"), false);
}
async function getPetaBoards() {
  boards.value = await API.send("getPetaBoards");
  dbPetaBoardsToPetaBoards(boards.value, petaImages.value, false);
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
    const petaImage = petaImages.value[id];
    if (!petaImage) return;
    if (!orderedAddPanelDragEvent.value) return;
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
  _this.$states.selectedPetaBoardId = board.id;
  _this.$states.loadedPetaBoardId = "";
  if (errorPetaBoardId.value === board.id) {
    if (
      (await _this.$components.dialog.show(_this.$t("boards.selectErrorBoardDialog", [board.name]), [
        _this.$t("shared.yes"),
        _this.$t("shared.no"),
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
  if (
    (await _this.$components.dialog.show(_this.$t("boards.removeDialog", [board.name]), [
      _this.$t("shared.yes"),
      _this.$t("shared.no"),
    ])) != 0
  ) {
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
