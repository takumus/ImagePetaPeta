<template>
  <t-root
    :class="{
      dark: $darkMode.value
    }"
  >
    <t-content>
      <t-top>
        <VTitleBar>
          <VTabBar
            :boards="sortedPetaBoards"
            :title="title"
            :currentPetaBoardId="currentPetaBoardId"
            @remove="removePetaBoard"
            @add="addPetaBoard"
            @select="selectPetaBoard"
            @sort="changePetaBoards"
            @change="changePetaBoard"
            ref="vTabBar"
          />
        </VTitleBar>
        <VUtilsBar>
          <VBoardProperty :board="currentPetaBoard" />
        </VUtilsBar>
      </t-top>
      <t-browser>
        <VBoard
          :zIndex="1"
          :board="currentPetaBoard"
          :detailsMode="false"
          ref="vPetaBoard"
          @change="changePetaBoard"
        />
      </t-browser>
    </t-content>
    <t-modals
      v-show="this.$components.modal.modalIds.length > 0"
    >
      <VImageImporter
        @addPanelByDragAndDrop="addPanelByDragAndDrop"
      />
      <VTasks />
    </t-modals>
    <VDialog
      :zIndex="6"
    ></VDialog>
    <VContextMenu
      :zIndex="4"
    />
    <VComplement
      :zIndex="5"
    />
  </t-root>
</template>

<script lang="ts">
// Vue
import { Options, Vue } from "vue-class-component";
import { Ref, Watch } from "vue-property-decorator";
// Components
import VBrowser from "@/rendererProcess/components/browser/VBrowser.vue";
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
import { API } from "@/rendererProcess/api";
import { BOARD_ADD_MULTIPLE_OFFSET_X, BOARD_ADD_MULTIPLE_OFFSET_Y, DEFAULT_BOARD_NAME, DEFAULT_IMAGE_SIZE, DOWNLOAD_URL, SAVE_DELAY } from "@/commons/defines";
import { dbPetaImagesToPetaImages, dbPetaImageToPetaImage, PetaImages } from "@/commons/datas/petaImage";
import { PetaBoard, createPetaBoard, dbPetaBoardsToPetaBoards, petaBoardsToDBPetaBoards } from "@/commons/datas/petaBoard";
import { PetaPanel, createPetaPanel } from "@/commons/datas/petaPanel";
import { UpdateMode } from "@/commons/api/interfaces/updateMode";
import { DelayUpdater } from "@/rendererProcess/utils/delayUpdater";
import { Vec2 } from "@/commons/utils/vec2";
import getNameAvoidDuplication from "@/rendererProcess/utils/getNameAvoidDuplication";
import { PetaTagInfo } from "@/commons/datas/petaTagInfo";
import { logChunk } from "@/rendererProcess/utils/rendererLogger";
import { minimId } from "@/commons/utils/utils";
@Options({
  components: {
    VBrowser,
    VBoard,
    VImageImporter,
    VTasks,
    VTabBar,
    VBoardProperty,
    VTitleBar,
    VContextMenu,
    VComplement,
    VDialog,
    VUtilsBar
  },
})
export default class BoardIndex extends Vue {
  @Ref("vPetaBoard")
  vPetaBoard!: VBoard;
  @Ref("vTabBar")
  vTabBar!: VTabBar;
  petaImages: PetaImages = {};
  boards: PetaBoard[] = [];
  orderedAddPanelIds: string[] = [];
  orderedAddPanelDragEvent = new Vec2();
  boardUpdaters: {[key: string]: DelayUpdater<PetaBoard>} = {};
  currentPetaBoardId = "";
  title = "";
  errorPetaBoardId = "";
  async mounted() {
    API.on("updatePetaImages", async (e, petaImages, mode) => {
      if (mode === UpdateMode.UPSERT) {
        let changeCurrentBoard = false;
        petaImages.forEach((petaImage) => {
          this.petaImages[petaImage.id] = dbPetaImageToPetaImage(petaImage);
          this.boards.forEach((board) => {
            board.petaPanels.forEach((petaPanel) => {
              if (petaPanel.petaImageId === petaImage.id) {
                petaPanel._petaImage = this.petaImages[petaImage.id];
              }
            });
          });
          if (this.currentPetaBoard) {
            changeCurrentBoard = this.currentPetaBoard.petaPanels.filter((petaPanel) => {
              return petaPanel.petaImageId === petaImage.id;
            }).length > 0;
          }
          if (changeCurrentBoard) {
            this.vPetaBoard.load();
          }
        });
        this.addOrderedPetaPanels();
      } else if (mode === UpdateMode.UPDATE) {
        petaImages.forEach((newPetaImage) => {
          const petaImage = this.petaImages[newPetaImage.id];
          if (petaImage) {
            Object.assign(petaImage, dbPetaImageToPetaImage(newPetaImage));
          }
        });
        this.vPetaBoard.orderPIXIRender();
      } else if (mode === UpdateMode.REMOVE) {
        let changeCurrentBoard = false;
        petaImages.forEach((petaImage) => {
          delete this.petaImages[petaImage.id];
          this.boards.forEach((board) => {
            board.petaPanels.forEach((petaPanel) => {
              if (petaPanel.petaImageId === petaImage.id) {
                petaPanel._petaImage = undefined;
              }
            });
          });
          if (this.currentPetaBoard) {
            changeCurrentBoard = this.currentPetaBoard.petaPanels.filter((petaPanel) => {
              return petaPanel.petaImageId === petaImage.id;
            }).length > 0;
          }
        });
        if (changeCurrentBoard) {
          this.vPetaBoard.load();
        }
      }
    });
    API.on("notifyUpdate", async (event, latest, downloaded) => {
      if (downloaded && await this.$components.dialog.show(
        this.$t("utils.installUpdateDialog", [this.$appInfo.version, latest]), [this.$t("shared.yes"), this.$t("shared.no")]
      ) == 0) {
        await API.send("installUpdate");
        API.send("openURL", `${DOWNLOAD_URL}${latest}`);
      } else if (!downloaded && await this.$components.dialog.show(
        this.$t("utils.downloadUpdateDialog", [this.$appInfo.version, latest]), [this.$t("shared.yes"), this.$t("shared.no")]
      ) == 0) {
        API.send("openURL", `${DOWNLOAD_URL}${latest}`);
      }
    });
    this.title = `${this.$t("titles.boards")} - ${this.$appInfo.name} ${this.$appInfo.version}`;
    document.title = this.title;
    await this.getPetaImages();
    await this.getPetaBoards();
    await this.restoreBoard();
    this.$nextTick(() => {
      API.send("showMainWindow");
    });
  }
  async restoreBoard() {
    const states = await API.send("getStates");
    this.errorPetaBoardId = states.selectedPetaBoardId != states.loadedPetaBoardId ? states.selectedPetaBoardId : "";
    const lastBoard = this.boards.find((board) => board.id == states.selectedPetaBoardId);
    this.selectPetaBoard(lastBoard);
    if (!lastBoard) {
      this.selectPetaBoard(this.boards[0]);
    }
  }
  async getPetaImages() {
    this.petaImages = dbPetaImagesToPetaImages(await API.send("getPetaImages"), false);
  }
  async getPetaBoards() {
    this.boards = await API.send("getPetaBoards");
    dbPetaBoardsToPetaBoards(this.boards, this.petaImages, false);
    this.boards.forEach((board) => {
      if (!this.boardUpdaters[board.id]) {
        this.boardUpdaters[board.id] = new DelayUpdater(SAVE_DELAY);
        this.boardUpdaters[board.id]!.initData(petaBoardsToDBPetaBoards(board));
        this.boardUpdaters[board.id]!.onUpdate((board) => {
          API.send("updatePetaBoards", [board], UpdateMode.UPDATE);
        });
      }
    });
  }
  addPanelByDragAndDrop(ids: string[], mouse: Vec2, fromBrowser: boolean) {
    this.orderedAddPanelIds = ids;
    this.orderedAddPanelDragEvent = mouse;
    if (fromBrowser) {
      this.addOrderedPetaPanels();
    }
  }
  addOrderedPetaPanels() {
    let offsetIndex = 0;
    this.orderedAddPanelIds.forEach((id, i) => {
      const petaImage = this.petaImages[id];
      if (!petaImage) return;
      if (!this.orderedAddPanelDragEvent) return;
      const panel = createPetaPanel(
        petaImage,
        this.orderedAddPanelDragEvent.clone().add(new Vec2(BOARD_ADD_MULTIPLE_OFFSET_X, BOARD_ADD_MULTIPLE_OFFSET_Y).mult(i)),
        DEFAULT_IMAGE_SIZE,
        petaImage.height * DEFAULT_IMAGE_SIZE
      );
      // if (!this.$components.browser.visible) {
        this.addPanel(panel, offsetIndex++);
      // }
    });
    if (this.orderedAddPanelIds.length > 0) {
      this.orderedAddPanelIds = [];
      if (this.currentPetaBoard) {
        this.vPetaBoard.load();
      }
    }
  }
  addPanel(petaPanel: PetaPanel, offsetIndex: number) {
    if (!this.currentPetaBoard) return;
    this.currentPetaBoard.petaPanels.push(petaPanel);
    this.vPetaBoard.addPanel(petaPanel, offsetIndex);
  }
  async selectPetaBoard(board: PetaBoard | undefined) {
    if (!board) {
      return;
    }
    if (this.currentPetaBoard?.id == board.id) {
      return;
    }
    logChunk().log("vIndex", "PetaBoard Selected", minimId(board.id));
    this.$states.selectedPetaBoardId = board.id;
    this.$states.loadedPetaBoardId = "";
    if (this.errorPetaBoardId == board.id) {
      if (await this.$components.dialog.show(this.$t("boards.selectErrorBoardDialog", [board.name]), [this.$t("shared.yes"), this.$t("shared.no")]) != 0) {
        return;
      } else {
        this.errorPetaBoardId = "";
      }
    }
    this.currentPetaBoardId = board.id;
  }
  savePetaBoard(board: PetaBoard, immidiately: boolean) {
    this.boardUpdaters[board.id]!.order(petaBoardsToDBPetaBoards(board));
    if (immidiately) {
      this.boardUpdaters[board.id]!.forceUpdate();
    }
  }
  async removePetaBoard(board: PetaBoard) {
    if (await this.$components.dialog.show(this.$t("boards.removeDialog", [board.name]), [this.$t("shared.yes"), this.$t("shared.no")]) != 0) {
      return;
    }
    this.boardUpdaters[board.id]!.forceUpdate();
    const leftBoardId = this.boards[this.boards.findIndex((b) => b.id == board.id) - 1]?.id;
    await API.send("updatePetaBoards", [board], UpdateMode.REMOVE);
    await this.getPetaBoards();
    const leftBoard = this.boards.find((board) => board.id == leftBoardId);
    if (leftBoard) {
      this.selectPetaBoard(leftBoard);
    } else {
      this.selectPetaBoard(this.boards[0]);
    }
  }
  async addPetaBoard() {
    const name = getNameAvoidDuplication(DEFAULT_BOARD_NAME, this.boards.map((b) => b.name));
    const board = createPetaBoard(name, Math.max(...this.boards.map((b) => b.index), 0) + 1, this.$darkMode.value);
    await API.send(
      "updatePetaBoards",
      [board],
      UpdateMode.UPSERT
    );
    logChunk().log("vIndex", "PetaBoard Added", minimId(board.id));
    await this.getPetaBoards();
    this.selectPetaBoard(board);
  }
  get currentPetaBoard(): PetaBoard | undefined {
    if (this.errorPetaBoardId == this.currentPetaBoardId) {
      return undefined;
    }
    return this.boards.find((board) => board.id == this.currentPetaBoardId);
  }
  get sortedPetaBoards() {
    return this.boards.sort((a, b) => a.index - b.index);
  }
  changePetaBoard(board: PetaBoard) {
    if (!board) {
      return;
    }
    this.savePetaBoard(board, false);
  }
  changePetaBoards() {
    this.boards.forEach((board) => {
      this.savePetaBoard(board, true);
    });
  }
  @Watch("$focusedWindows.focused")
  changeWindowIsFocused() {
    // console.log(this.$focusedWindows.focused);
    if (!this.$focusedWindows.focused) {
      this.vPetaBoard.clearSelectionAll(true);
      this.vPetaBoard.orderPIXIRender();
    }
  }
}
</script>

<style lang="scss" scoped>
t-root {
  >t-content {
    position: fixed;
    top: 0px;
    left: 0px;
    display: flex;
    height: 100%;
    width: 100%;
    flex-direction: column;
    z-index: 3;
    >t-top {
      display: block;
      width: 100%;
      z-index: 2;
    }
    >t-browser {
      display: block;
      overflow: hidden;
      background-color: var(--bg-color);
      flex: 1;
      z-index: 1;
    }
  }
  >t-modals {
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