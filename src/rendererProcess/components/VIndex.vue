<template>
  <article
    class="root"
    :class="{
      dark: darkMode
    }"
  >
    <VBoard
      :zIndex="1"
      :board="currentPetaBoard"
      ref="vPetaBoard"
      @change="changePetaBoard"
    />
    <VTabBar
      :zIndex="3"
      :uiVisible="uiVisible"
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
    <section
      class="modals"
      v-show="this.$components.modal.modalIds.length > 0"
    >
      <VBrowser
        :petaImages="petaImages"
        :petaTagInfos="petaTagInfos"
        @addPanel="addPanel"
      />
      <VInfo />
      <VSettings />
      <VImageImporter
        @addPanelByDragAndDrop="addPanelByDragAndDrop"
      />
      <VTasks />
    </section>
    <VDialog
      :zIndex="6"
    ></VDialog>
    <VContextMenu
      :zIndex="4"
    />
    <VComplement
      :zIndex="5"
    />
  </article>
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
import VTabBar from "@/rendererProcess/components/tabBar/VTabBar.vue";
import VContextMenu from "@/rendererProcess/components/utils/VContextMenu.vue";
import VComplement from "@/rendererProcess/components/utils/VComplement.vue";
import VInfo from "@/rendererProcess/components/info/VInfo.vue";
import VSettings from "@/rendererProcess/components/settings/VSettings.vue";
import VDialog from "@/rendererProcess/components/utils/VDialog.vue";
// Others
import { API } from "@/rendererProcess/api";
import { BOARD_ADD_MULTIPLE_OFFSET_X, BOARD_ADD_MULTIPLE_OFFSET_Y, DEFAULT_BOARD_NAME, DEFAULT_IMAGE_SIZE, DOWNLOAD_URL, SAVE_DELAY, UPDATE_CHECK_INTERVAL } from "@/commons/defines";
import { dbPetaImagesToPetaImages, PetaImages } from "@/commons/datas/petaImage";
import { PetaBoard, createPetaBoard, dbPetaBoardsToPetaBoards, petaBoardsToDBPetaBoards } from "@/commons/datas/petaBoard";
import { PetaPanel, createPetaPanel } from "@/commons/datas/petaPanel";
import { UpdateMode } from "@/commons/api/interfaces/updateMode";
import { DelayUpdater } from "@/rendererProcess/utils/delayUpdater";
import { Vec2 } from "@/commons/utils/vec2";
import { isLatest } from "@/commons/utils/versionCheck";
import getNameAvoidDuplication from "@/rendererProcess/utils/getNameAvoidDuplication";
import { PetaTag } from "@/commons/datas/petaTag";
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
    VContextMenu,
    VComplement,
    VInfo,
    VSettings,
    VDialog
  },
})
export default class Index extends Vue {
  @Ref("vPetaBoard")
  vPetaBoard!: VBoard;
  @Ref("vTabBar")
  vTabBar!: VTabBar;
  petaImages: PetaImages = {};
  boards: PetaBoard[] = [];
  petaTagInfos: PetaTagInfo[] = [];
  orderedAddPanelIds: string[] = [];
  orderedAddPanelDragEvent = new Vec2();
  boardUpdaters: {[key: string]: DelayUpdater<PetaBoard>} = {};
  windowIsFocused = true;
  currentPetaBoardId = "";
  title = "";
  async mounted() {
    window.onerror = (e) => {
      logChunk().log("vIndex", "window error:", e);
    }
    logChunk().log("vIndex", "INIT RENDERER!");
    API.on("updatePetaImages", (e) => {
      this.getPetaImages();
    });
    API.on("updatePetaTags", (e) => {
      this.getPetaTagInfos();
    });
    API.on("updatePetaImage", (e, petaImage) => {
      // log("vIndex", "on savePetaImage", petaImage.id);
      // this.petaImages[petaImage.id] = petaImage;
    });
    API.on("notifyUpdate", async (event, current, latest) => {
      if (
        this.$systemInfo.platform == "win32"
        && await this.$components.dialog.show(
          this.$t("utils.updateDialog", [current, latest]), [this.$t("shared.yes"), this.$t("shared.no")]
        ) == 0
      ) {
        await API.send("installUpdate");
        API.send("openURL", `${DOWNLOAD_URL}${latest}`);
      }
    });
    API.on("windowFocused", (e, focused) => {
      this.windowIsFocused = focused;
      if (!focused) {
        this.vPetaBoard.clearSelectionAll(true);
        this.vPetaBoard.orderPIXIRender();
      }
    });
    this.windowIsFocused = await API.send("getWindowIsFocused");
    this.title = `${this.$appInfo.name} ${this.$appInfo.version}`;
    document.title = this.title;
    await this.getPetaImages();
    await this.getPetaBoards();
    await this.getPetaTagInfos();
    await this.restoreBoard();
    this.$nextTick(() => {
      API.send("showMainWindow");
    });
  }
  async restoreBoard() {
    const id = (await API.send("getStates")).selectedPetaBoardId;
    const lastBoard = this.boards.find((board) => board.id == id);
    this.selectPetaBoard(lastBoard);
    if (!lastBoard) {
      this.selectPetaBoard(this.boards[0]);
    }
  }
  async getPetaImages() {
    this.petaImages = dbPetaImagesToPetaImages(await API.send("getPetaImages"), false);
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
      if (!this.$components.browser.visible) {
        this.addPanel(panel, offsetIndex++);
      }
    });
    this.orderedAddPanelIds = [];
    if (this.currentPetaBoard) {
      this.vPetaBoard.load();
    }
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
  async getPetaTagInfos() {
    this.petaTagInfos = await API.send("getPetaTagInfos");
  }
  addPanelByDragAndDrop(ids: string[], mouse: Vec2) {
    this.orderedAddPanelIds = ids;
    this.orderedAddPanelDragEvent = mouse;
  }
  addPanel(petaPanel: PetaPanel, offsetIndex: number) {
    if (!this.currentPetaBoard) return;
    this.currentPetaBoard.petaPanels.push(petaPanel);
    this.vPetaBoard.addPanel(petaPanel, offsetIndex);
  }
  selectPetaBoard(board: PetaBoard | undefined) {
    if (!board) {
      return;
    }
    if (this.currentPetaBoard?.id == board.id) {
      return;
    }
    logChunk().log("vIndex", "PetaBoard Selected", minimId(board.id));
    API.send("setSelectedPetaBoard", board.id);
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
    const board = createPetaBoard(name, Math.max(...this.boards.map((b) => b.index), 0) + 1, this.darkMode);
    await API.send(
      "updatePetaBoards",
      [board],
      UpdateMode.UPSERT
    );
    logChunk().log("vIndex", "PetaBoard Added", minimId(board.id));
    await this.getPetaBoards();
    this.selectPetaBoard(board);
  }
  get currentPetaBoard() {
    return this.boards.find((board) => board.id == this.currentPetaBoardId);
  }
  get sortedPetaBoards() {
    return this.boards.sort((a, b) => a.index - b.index);
  }
  get darkMode() {
    if (this.$settings.autoDarkMode) {
      return this.$systemDarkMode.value;
    }
    return this.$settings.darkMode;
  }
  get uiVisible() {
    return this.$settings.autoHideUI ? this.windowIsFocused : true;
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
}
</script>

<style lang="scss">
*, *:before, *:after {
  box-sizing: border-box;
}
body, html {
  overflow: hidden;
  width: 100%;
  height: 100%;
  user-select: none;
  margin: 0px;
  padding: 0px;
  font-size: 12px;
  font-family: "Helvetica Neue",
    Arial,
    "Hiragino Kaku Gothic ProN",
    "Hiragino Sans",
    Meiryo,
    sans-serif;
}
.root {
  --rounded: 8px;
  & {
    --bg-color: #ffffff;
    --modal-bg-color: #00000070;
    --border-color: #999999;
    --font-color: #333333;
    --button-bg-color: #ffffff;
    --button-hover-bg-color: #e9e9e9;
    --button-active-bg-color: #dddddd;
    --tab-bg-color: #e9e9e9;
    --tab-selected-color: #ffffff;
    --tab-hovered-color: #f5f5f5;
    --tab-border-color: #cccccc;
    --window-buttons-hover: #cccccc;
    --window-buttons-close-hover: #ff0000;
    --contextmenu-item-color: #ffffff;
    --contextmenu-item-hover-color: #e9e9e9;
    --icon-filter: brightness(0.7) invert(100%);
  }
  &.dark {
    --bg-color: #141414;
    --modal-bg-color: #ffffff30;
    --border-color: #5c5c5c;
    --font-color: #d3d3d3;
    --button-bg-color: #141414;
    --button-hover-bg-color: #272727;
    --button-active-bg-color: #3f3f3f;
    --tab-bg-color: #272727;
    --tab-selected-color: #141414;
    --tab-hovered-color: #202020;
    --tab-border-color: #444444;
    --window-buttons-hover: #444444;
    --window-buttons-close-hover: #ff0000;
    --contextmenu-item-color: #272727;
    --contextmenu-item-hover-color: #444444;
    --icon-filter: unset;
  }
  background-color: var(--bg-color);
  color: var(--font-color);
  ::-webkit-scrollbar {
    width: 8px;
  }
  ::-webkit-scrollbar-thumb {
    background-color: #cccccc;
    border-radius: var(--rounded);
    min-height: 16px;
  }
  >.border {
    z-index: 10;
    position: fixed;
    width: 100%;
    height: 100%;
    // border: solid 1.5px var(--font-color);
    pointer-events: none;
  }
  button {
    display: inline-block;
    border-radius: var(--rounded);
    border: none;
    background-color: var(--button-bg-color);
    color: var(--font-color);
    padding: 4px 16px;
    height: 24px;
    line-height: 1.0em;
    font-size: 1.0em;
    cursor: pointer;
    // box-shadow: 0px 0px 2px rgba(0, 0, 0, 0.5);
    border: solid 1.2px var(--border-color);
    margin: 4px;
    outline: none;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    &:hover {
      background-color: var(--button-hover-bg-color);
      // box-shadow: 0px 0px 4px rgba(0, 0, 0, 0.5);
    }
    &:active {
      background-color: var(--button-active-bg-color);
      // box-shadow: inset 0px 0px 2px rgba(0, 0, 0, 0.5);
    }
  }
  >.menu {
    position: fixed;
    z-index: 4;
    bottom: 0px;
    left: 0px;
    text-align: right;
    padding: 8px;
  }
  >.modals {
    position: absolute;
    width: 100%;
    height: 100%;
    top: 0px;
    left: 0px;
    z-index: 2;
  }
}
</style>