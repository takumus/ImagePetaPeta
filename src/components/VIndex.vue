<template>
  <article
    class="root"
    :class="{
      dark: darkMode
    }"
  >
    <VBoard
      :zIndex="1"
      v-if="currentPetaBoard"
      :board="currentPetaBoard"
      :windowIsFocused="windowIsFocused"
      ref="vPetaBoard"
      @change="changePetaBoard"
    />
    <VTabBar
      :zIndex="3"
      :hide="!windowIsFocused"
      :boards="sortedPetaBoards"
      :customTitlebar="customTitlebar"
      :title="title"
      @remove="removePetaBoard"
      @add="addPetaBoard"
      @select="selectPetaBoard"
      @sort="changePetaBoards"
      ref="vTabBar"
    />
    <section
      class="modals"
      v-show="this.$globalComponents.currentModalId.length > 0"
    >
      <VBrowser
        :petaImages="petaImages"
        @addPanel="addPanel"
      />
      <VInfo />
      <VSettings />
      <VImageImporter
        @addPanelByDragAndDrop="addPanelByDragAndDrop"
      />
    </section>
    <VContextMenu
      :zIndex="4"
    />
    <VComplement
      :zIndex="5"
    />
    <section
      class="menu"
      v-show="windowIsFocused"
    >
      <button
        tabindex="-1"
        @click="$globalComponents.settings.open"
      >
      {{$t("home.settingsButton")}}
      </button>
      <button
        tabindex="-1"
        @click="$globalComponents.info.open"
      >
      {{$t("home.infoButton")}}
      </button>
    </section>
    <section class="border">
    </section>
  </article>
</template>

<script lang="ts">
// Vue
import { Options, Vue } from "vue-class-component";
import { Ref, Watch } from "vue-property-decorator";
// Components
import VBrowser from "@/components/browser/VBrowser.vue";
import VBoard from "@/components/board/VBoard.vue";
import VImageImporter from "@/components/utils/VImageImporter.vue";
import VTabBar from "@/components/tab/VTabBar.vue";
import VContextMenu from "@/components/utils/VContextMenu.vue";
import VComplement from "@/components/utils/VComplement.vue";
import VInfo from "@/components/utils/VInfo.vue";
import VSettings from "@/components/utils/VSettings.vue";
// Others
import { API, log } from "@/api";
import { BOARD_ADD_MULTIPLE_OFFSET, BOARD_MAX_PETAPANEL_ADD_COUNT, DEFAULT_BOARD_NAME, DEFAULT_IMAGE_SIZE, DOWNLOAD_URL, SAVE_DELAY } from "@/defines";
import { PetaImages } from "@/datas/petaImage";
import { PetaBoard, createPetaBoard, dbPetaBoardsToPetaBoards, petaBoardsToDBPetaBoards } from "@/datas/petaBoard";
import { ImportImageResult } from "@/datas/importImageResult";
import { PetaPanel, createPetaPanel } from "@/datas/petaPanel";
import { UpdateMode } from "@/datas/updateMode";
import { DelayUpdater } from "@/utils/delayUpdater";
import { Vec2, vec2FromMouseEvent } from "@/utils/vec2";
@Options({
  components: {
    VBrowser,
    VBoard,
    VImageImporter,
    VTabBar,
    VContextMenu,
    VComplement,
    VInfo,
    VSettings
  },
})
export default class Index extends Vue {
  @Ref("vPetaBoard")
  vPetaBoard!: VBoard;
  @Ref("vTabBar")
  vTabBar!: VTabBar;
  petaImages: PetaImages = {};
  boards: PetaBoard[] = [];
  currentPetaBoard: PetaBoard | null = null;
  orderedAddPanelIds: string[] = [];
  orderedAddPanelDragEvent?: DragEvent;
  boardUpdaters: {[key: string]: DelayUpdater<PetaBoard>} = {};
  windowIsFocused = true;
  systemDarkMode = false;
  title = "";
  async mounted() {
    window.onerror = (e) => {
      log("window error:", e);
    }
    log("INIT RENDERER!");
    this.$globalComponents.importImages = () => {
      API.send("browseImages");
    }
    API.on("importImagesComplete", (e, fileCount, addedFileCount) => {
      this.getPetaImages();
    });
    API.on("updatePetaImages", (e) => {
      this.getPetaImages();
    });
    API.on("updatePetaImage", (e, petaImage) => {
      // log("on savePetaImage", petaImage.id);
      // this.petaImages[petaImage.id] = petaImage;
    });
    API.send("checkUpdate").then(async (result) => {
      if (result.current != result.latest) {
        if (await API.send("dialog", this.$t("utils.updateDialog", [result.current, result.latest]), [this.$t("shared.yes"), this.$t("shared.no")]) == 0) {
          API.send("openURL", `${DOWNLOAD_URL}${result.latest}`);
        }
      }
    });
    API.on("windowFocused", (e, focused) => {
      this.windowIsFocused = focused;
    });
    this.windowIsFocused = await API.send("getWindowIsFocused");
    const info = await API.send("getAppInfo");
    this.title = `${info.name} ${info.version}`;
    this.getSystemDarkMode();
    await this.getPetaImages();
    await this.getPetaBoards();
    this.$nextTick(() => {
      API.send("showMainWindow");
    })
  }
  async getPetaImages() {
    this.petaImages = await API.send("getPetaImages");
    let offsetIndex = 0;
    this.orderedAddPanelIds.forEach((id, i) => {
      const petaImage = this.petaImages[id];
      if (!petaImage) return;
      if (!this.orderedAddPanelDragEvent) return;
      const panel = createPetaPanel(
        petaImage,
        vec2FromMouseEvent(this.orderedAddPanelDragEvent).add(BOARD_ADD_MULTIPLE_OFFSET.clone().mult(i)),
        DEFAULT_IMAGE_SIZE,
        petaImage.height * DEFAULT_IMAGE_SIZE
      );
      if (!this.$globalComponents.browser.visible) {
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
    dbPetaBoardsToPetaBoards(this.boards, this.petaImages);
    this.boards.forEach((board) => {
      if (!this.boardUpdaters[board.id]) {
        this.boardUpdaters[board.id] = new DelayUpdater(SAVE_DELAY);
        this.boardUpdaters[board.id].initData(petaBoardsToDBPetaBoards(board));
        this.boardUpdaters[board.id].onUpdate((board) => {
          API.send("savePetaBoards", [board], UpdateMode.UPDATE);
        });
      }
    });
  }
  addPanelByDragAndDrop(ids: string[], mouse: DragEvent) {
    this.orderedAddPanelIds = ids;
    this.orderedAddPanelDragEvent = mouse;
  }
  addPanel(petaPanel: PetaPanel, offsetIndex: number) {
    if (!this.currentPetaBoard) return;
    this.currentPetaBoard.petaPanels.push(petaPanel);
    this.vPetaBoard.addPanel(petaPanel, offsetIndex);
  }
  selectPetaBoard(board: PetaBoard) {
    if (this.currentPetaBoard?.id == board.id) {
      return;
    }
    log("PetaBoard Selected", board.name);
    this.currentPetaBoard = board;
    this.$nextTick(() => {
      this.vPetaBoard.load();
    });
  }
  savePetaBoard(board: PetaBoard, immidiately: boolean) {
    this.boardUpdaters[board.id].order(petaBoardsToDBPetaBoards(board));
    if (immidiately) {
      this.boardUpdaters[board.id].forceUpdate();
    }
  }
  async removePetaBoard(board: PetaBoard) {
    if (await API.send("dialog", this.$t("boards.removeDialog", [board.name]), [this.$t("shared.yes"), this.$t("shared.no")]) != 0) {
      return;
    }
    this.boardUpdaters[board.id].forceUpdate();
    await API.send("savePetaBoards", [board], UpdateMode.REMOVE);
    await this.getPetaBoards();
  }
  async addPetaBoard() {
    const basename = DEFAULT_BOARD_NAME;
    const names = this.boards.map((b) => b.name);
    let name = basename;
    for (let i = 2; names.includes(name); i++) {
      name = basename + (i > 0 ? `(${i})` : "");
    }
    const board = createPetaBoard(name, Math.max(...this.boards.map((b) => b.index), 0) + 1, this.$settings.darkMode);
    await API.send(
      "savePetaBoards",
      [board],
      UpdateMode.INSERT
    );
    log("PetaBoard Added", board.name);
    await this.getPetaBoards();
    this.vTabBar.selectPetaBoardByIndex(this.boards.length - 1);
  }
  get sortedPetaBoards() {
    return this.boards.sort((a, b) => a.index - b.index);
  }
  get customTitlebar() {
    return this.$systemInfo.platform == "win32";
  }
  get darkMode() {
    if (this.$settings.autoDarkMode) {
      return this.systemDarkMode;
    }
    return this.$settings.darkMode;
  }
  getSystemDarkMode() {
    this.systemDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTimeout(() => {
      this.getSystemDarkMode();
    }, 1000);
  }
  changePetaBoard(board: PetaBoard) {
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
}
.root {
  --rounded: 6px;
  --bg-color: #ffffff;
  --modal-bg-color: #00000070;
  --border-color: #999999;
  --font-color: #333333;
  --button-bg-color: #ffffff;
  --button-hover-bg-color: #eeeeee;
  --button-active-bg-color: #eeeeee;
  --tab-bg-color: #eeeeee;
  --tab-selected-color: #ffffff;
  --tab-border-color: #cccccc;
  --window-buttons-hover: #cccccc;
  --window-buttons-close-hover: #ff0000;
  --petapanel-bg-color: #eeeeee;
  &.dark {
    --bg-color: #333333;
    --modal-bg-color: #ffffff50;
    --border-color: #cccccc;
    --font-color: #ffffff;
    --button-bg-color: #444444;
    --button-hover-bg-color: #555555;
    --button-active-bg-color: #555555;
    --tab-bg-color: #333333;
    --tab-selected-color: #222222;
    --tab-border-color: #444444;
    --window-buttons-hover: #444444;
    --window-buttons-close-hover: #ff0000;
    --petapanel-bg-color: #555555;
  }
  background-color: var(--bg-color);
  color: var(--font-color);
  font-size: 12px;
  font-family: "Helvetica Neue",
    Arial,
    "Hiragino Kaku Gothic ProN",
    "Hiragino Sans",
    Meiryo,
    sans-serif;
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
    border: solid 1px var(--border-color);
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