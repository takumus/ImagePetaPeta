<template>
  <section class="board-component">
    <VBoard
      v-if="currentBoard"
      :board="currentBoard"
      ref="vBoard"
      @openBrowser="openBrowser"
    />
  </section>
  <section
    class="browser-component"
    v-show="browsing"
  >
    <VBrowser
      :petaImages="petaImages"
      :categories="categories"
      @addPanel="addPanel"
      :visible="browsing"
    />
  </section>
  <article class="menu">
    <button
      @click="importImages"
    >
      ファイル読み込み
    </button>
    <button
      @click="openBrowser"
    >
      {{ browsing ? "ブラウザを閉じる" : "ブラウザを開く" }}
    </button>
  </article>
  <VTabBar
    :boards="_boards"
    @remove="removeBoard"
    @add="addBoard"
    @select="selectBoard"
    @sort="sortBoards"
    ref="vTabBar"
  />
  <VImageImporter @addPanelByDragAndDrop="addPanelByDragAndDrop"/>
  <VImageCache />
  <article class="context-menu">
    <VContextMenu ref="contextMenu"/>
  </article>
</template>

<style lang="scss">
*, *:before, *:after {
  box-sizing: border-box;
}
#app {
  width: 100%;
  height: 100%;
  margin: 0px;
  padding: 0px;
}
.board-component {
  position: absolute;
  z-index: 1;
  top: 0px;
  left: 0px;
  width: 100%;
  height: 100%;
}
.browser-component {
  position: absolute;
  z-index: 3;
  top: 0px;
  left: 0px;
  width: 100%;
  height: 100%;
  padding: 100px;
  background-color: rgba($color: #000000, $alpha: 0.7);
}
body, html {
  overflow: hidden;
  color: #ffffff;
  width: 100%;
  height: 100%;
  user-select: none;
  margin: 0px;
  padding: 0px;
  background-color: #ffffff;
  font-size: 16px;
  font-family: "Helvetica Neue",
    Arial,
    "Hiragino Kaku Gothic ProN",
    "Hiragino Sans",
    Meiryo,
    sans-serif;
}
.menu {
  position: fixed;
  z-index: 4;
  bottom: 0px;
  left: 0px;
  text-align: right;
}
.context-menu {
  position: fixed;
  z-index: 5;
}
@import url("./styles/shared.scss");
</style>

<script lang="ts">
import vue from "vue";
import { Options, Vue } from "vue-class-component";
import { Ref, Watch } from "vue-property-decorator";

import VPanel from "@/components/VPanel.vue";
import VBrowser from "@/components/VBrowser.vue";
import VBoard from "@/components/VBoard.vue";
import VImageImporter from "@/components/VImageImporter.vue";
import VImageCache from "@/components/VImageCache.vue";
import VTabBar from "@/components/VTabBar.vue";
import VContextMenu from "@/components/VContextMenu.vue";
import { Board, Categories, Category, createBoard, createCategory, createPetaPanel, ImportImageResult, MenuType, parseBoards, PetaImage, PetaImages, PetaPanel, UpdateMode } from "@/datas";
import { API, log } from "@/api";
import { DelayUpdater, Vec2 } from "@/utils";
import { DEFAULT_BOARD_NAME, SAVE_DELAY } from "./defines";
@Options({
  components: {
    VPanel,
    VBrowser,
    VBoard,
    VImageImporter,
    VImageCache,
    VTabBar,
    VContextMenu
  },
})
export default class App extends Vue {
  @Ref("vBoard")
  vBoard!: VBoard;
  @Ref("vTabBar")
  vTabBar!: VTabBar;
  @Ref("contextMenu")
  contextMenu!: VContextMenu;
  petaImages: PetaImages = {};
  categories: Categories = {};
  boards: Board[] = [];
  currentBoard: Board | null = null;
  imageZIndex = 0;
  browsing = false;
  orderedAddPanelIds: string[] = [];
  orderedAddPanelDragEvent?: DragEvent;
  boardUpdaters: {[key: string]: DelayUpdater<Board>} = {};
  async mounted() {
    API.on("importImagesComplete", (e, fileCount, addedFileCount) => {
      this.getPetaImages();
    });
    API.on("importImagesProgress", (e, progress, file, result) => {
      if (result == ImportImageResult.SUCCESS) {
        this.getPetaImages();
      }
    });
    API.on("updatePetaImages", (e) => {
      this.getPetaImages();
    });
    API.on("updatePetaImage", (e, petaImage) => {
      log("update a PetaImage", petaImage.id);
      // this.petaImages[petaImage.id] = petaImage;
    });
    await this.getAll();
    this.initSampleDatas();
  }
  initSampleDatas() {
    "色,構図,人体,顔,手".split(",").forEach((name) => {
      const cat = createCategory(name);
      this.categories[cat.id] = cat;
    });
  }
  async getAll() {
    await this.getPetaImages();
    await this.getCategories();
    await this.getBoards();
  }
  async getPetaImages() {
    log("load all PetaImages");
    this.petaImages = await API.send("getPetaImages", [], "");
    this.boards.forEach((board) => {
      // boardのpetaPanelを回す
      for (let i = board.petaPanels.length - 1; i >= 0; i--) {
        // petaImageIDが存在しない場合、パネルを削除する。
        if (!this.petaImages[board.petaPanels[i].petaImage.id]) {
          board.petaPanels.splice(i, 1);
        }
      }
    });
    this.orderedAddPanelIds.forEach((id) => {
      const petaImage = this.petaImages[id];
      if (!petaImage) return;
      if (!this.orderedAddPanelDragEvent) return;
      const panel = createPetaPanel(
        petaImage,
        new Vec2(this.orderedAddPanelDragEvent.clientX, this.orderedAddPanelDragEvent.clientY),
        100,
        petaImage.height * 100
      );
      if (!this.browsing) {
        this.addPanel(panel, new Vec2(0, 0));
      }
    });
    this.orderedAddPanelIds = [];
  }
  async getCategories() {
    log("load all categories");
    this.categories = await API.send("getCategories");
  }
  async getBoards() {
    log("load all boards");
    this.boards = parseBoards(await API.send("getBoards"), this.petaImages);
    this.boards.forEach((board) => {
      if (!this.boardUpdaters[board.id]) {
        this.boardUpdaters[board.id] = new DelayUpdater(SAVE_DELAY);
        this.boardUpdaters[board.id].initData(board);
        this.boardUpdaters[board.id].onUpdate((board) => {
          log("board saved", board.name);
          API.send("updateBoards", [board], UpdateMode.UPDATE);
        });
      }
    })
  }
  importImages() {
    API.send("browseImages").catch((reason) => {
      log(reason);
    });
  }
  openBrowser() {
    this.browsing = !this.browsing;
  }
  addPanelByDragAndDrop(ids: string[], mouse: DragEvent) {
    this.orderedAddPanelIds = ids;
    this.orderedAddPanelDragEvent = mouse;
  }
  addPanel(petaPanel: PetaPanel, worldPosition: Vec2) {
    if (!this.currentBoard) return;
    this.currentBoard.petaPanels.push(petaPanel);
    this.browsing = false;
    this.vBoard.addPanel(petaPanel, worldPosition);
  }
  selectBoard(board: Board) {
    log("board selected", board.name);
    if (this.currentBoard) {
      this.updateBoard(this.currentBoard, true);
    }
    this.currentBoard = board;
    this.$nextTick(() => {
      this.vBoard.load();
    });
  }
  updateBoard(board: Board, immidiately: boolean) {
    if (this.boardUpdaters[board.id].order(board)) {
      // log("board ordered", board.name);
    }
    if (immidiately) {
      this.boardUpdaters[board.id].forceUpdate();
    }
  }
  async removeBoard(board: Board) {
    if (await API.send("dialog", `Remove "${board.name}"?`, ["Yes", "No"]) != 0) {
      return;
    }
    this.boardUpdaters[board.id].forceUpdate();
    await API.send("updateBoards", [board], UpdateMode.REMOVE);
    await this.getBoards();
  }
  async addBoard() {
    const basename = DEFAULT_BOARD_NAME;
    const names = this.boards.map((b) => b.name);
    let name = basename;
    for (let i = 2; names.includes(name); i++) {
      name = basename + (i > 0 ? `(${i})` : "");
    }
    const board = createBoard(name, Math.max(...this.boards.map((b) => b.index), 0) + 1);
    await API.send(
      "updateBoards",
      [board],
      UpdateMode.INSERT
    );
    log("add board", board.name);
    await this.getBoards();
    this.vTabBar.selectBoardByIndex(this.boards.length - 1);
  }
  async sortBoards() {
    // await API.send("updateBoards", this.boards, UpdateMode.UPDATE);
    // log("sort boards");
  }
  get _boards() {
    return this.boards.sort((a, b) => a.index - b.index);
  }
  @Watch("boards", { deep: true })
  changeBoard() {
    // if (!this.currentBoard) return;
    this.boards.forEach((board) => {
      this.updateBoard(board, false);
    });
  }
}
</script>
