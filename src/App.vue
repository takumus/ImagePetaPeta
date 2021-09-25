<template>
  <section class="board-component">
    <VBoard
      v-if="currentBoard"
      :board="currentBoard"
      ref="vBoard"
    />
  </section>
  <VBrowser
    :petaImages="petaImages"
    @addPanel="addPanel"
  />
  <VTabBar
    :boards="sortedBoards"
    @remove="removeBoard"
    @add="addBoard"
    @select="selectBoard"
    ref="vTabBar"
  />
  <VImageImporter @addPanelByDragAndDrop="addPanelByDragAndDrop"/>
  <VImageCache />
  <VInfo ref="info"/>
  <article class="menu">
    <button tabindex="-1" @click="$globals.settings.open">{{$t("home.settingsButton")}}</button>
    <button tabindex="-1" @click="$globals.info.open">{{$t("home.infoButton")}}</button>
  </article>
  <article class="context-menu">
    <VContextMenu ref="contextMenu"/>
  </article>
  <article class="complement">
    <VComplement ref="complement"/>
  </article>
</template>

<style lang="scss">
*, *:before, *:after {
  box-sizing: border-box;
}
.board-component {
  position: absolute;
  z-index: 1;
  top: 0px;
  left: 0px;
  width: 100%;
  height: 100%;
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
  padding: 8px;
}
.complement {
  position: fixed;
  z-index: 5;
}
.context-menu {
  position: fixed;
  z-index: 6;
}
@import url("./styles/shared.scss");
</style>

<script lang="ts">
// Vue
import { Options, Vue } from "vue-class-component";
import { Ref, Watch } from "vue-property-decorator";
// Components
import VPanel from "@/components/board/VPanel.vue";
import VBrowser from "@/components/browser/VBrowser.vue";
import VBoard from "@/components/board/VBoard.vue";
import VImageImporter from "@/components/utils/VImageImporter.vue";
import VImageCache from "@/components/utils/VImageCache.vue";
import VTabBar from "@/components/VTabBar.vue";
import VContextMenu from "@/components/utils/VContextMenu.vue";
import VComplement from "@/components/utils/VComplement.vue";
import VInfo from "@/components/utils/VInfo.vue";
// Others
import { Board, createBoard, createPetaPanel, ImportImageResult, PetaImages, PetaPanel, UpdateMode, parseBoards, toDBBoard } from "@/datas";
import { API, log } from "@/api";
import { DelayUpdater, Vec2, vec2FromMouseEvent } from "@/utils";
import { DEFAULT_BOARD_NAME, DEFAULT_IMAGE_SIZE, DOWNLOAD_URL, SAVE_DELAY } from "@/defines";
@Options({
  components: {
    VPanel,
    VBrowser,
    VBoard,
    VImageImporter,
    VImageCache,
    VTabBar,
    VContextMenu,
    VComplement,
    VInfo
  },
})
export default class App extends Vue {
  @Ref("vBoard")
  vBoard!: VBoard;
  @Ref("vTabBar")
  vTabBar!: VTabBar;
  @Ref("contextMenu")
  contextMenu!: VContextMenu;
  @Ref("info")
  info!: VInfo;
  petaImages: PetaImages = {};
  boards: Board[] = [];
  currentBoard: Board | null = null;
  imageZIndex = 0;
  browsing = false;
  orderedAddPanelIds: string[] = [];
  orderedAddPanelDragEvent?: DragEvent;
  boardUpdaters: {[key: string]: DelayUpdater<Board>} = {};
  async mounted() {
    log("INIT RENDERER!");
    this.$globals.importImages = () => {
      API.send("browseImages");
    }
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
      log("on updatePetaImage", petaImage.id);
      // this.petaImages[petaImage.id] = petaImage;
    });
    API.send("checkUpdate").then(async (result) => {
      if (result.current.localeCompare(result.latest, "numeric") < 0) {
        if (await API.send("dialog", this.$t("utils.update", [result.current, result.latest]), [this.$t("shared.yes"), this.$t("shared.no")]) == 0) {
          API.send("openURL", `${DOWNLOAD_URL}${result.latest}`);
        }
      }
    });
    await this.getAll();
  }
  async getAll() {
    await this.getPetaImages();
    await this.getBoards();
  }
  async getPetaImages() {
    this.petaImages = await API.send("getPetaImages");
    this.boards.forEach((board) => {
      // boardのpetaPanelを回す
      for (let i = board.petaPanels.length - 1; i >= 0; i--) {
        // petaImageIDが存在しない場合、パネルを削除する。
        if (!this.petaImages[board.petaPanels[i].petaImageId]) {
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
        vec2FromMouseEvent(this.orderedAddPanelDragEvent),
        DEFAULT_IMAGE_SIZE,
        petaImage.height * DEFAULT_IMAGE_SIZE
      );
      if (!this.browsing) {
        this.addPanel(panel);
      }
    });
    this.orderedAddPanelIds = [];
  }
  async getBoards() {
    this.boards = await API.send("getBoards");
    parseBoards(this.boards, this.petaImages);
    this.boards.forEach((board) => {
      if (!this.boardUpdaters[board.id]) {
        this.boardUpdaters[board.id] = new DelayUpdater(SAVE_DELAY);
        this.boardUpdaters[board.id].initData(toDBBoard(board));
        this.boardUpdaters[board.id].onUpdate((board) => {
          API.send("updateBoards", [board], UpdateMode.UPDATE);
        });
      }
    })
  }
  addPanelByDragAndDrop(ids: string[], mouse: DragEvent) {
    this.orderedAddPanelIds = ids;
    this.orderedAddPanelDragEvent = mouse;
  }
  addPanel(petaPanel: PetaPanel, worldPosition?: Vec2) {
    if (!this.currentBoard) return;
    this.currentBoard.petaPanels.push(petaPanel);
    this.browsing = false;
    this.vBoard.addPanel(petaPanel, worldPosition);
  }
  selectBoard(board: Board) {
    log("Board Selected", board.name);
    if (this.currentBoard) {
      this.$globals
      this.updateBoard(this.currentBoard, true);
    }
    this.currentBoard = board;
    this.$nextTick(() => {
      this.vBoard.load();
    });
  }
  updateBoard(board: Board, immidiately: boolean) {
    this.boardUpdaters[board.id].order(toDBBoard(board));
    if (immidiately) {
      this.boardUpdaters[board.id].forceUpdate();
    }
  }
  async removeBoard(board: Board) {
    if (await API.send("dialog", this.$t("boards.removeDialog", [board.name]), [this.$t("shared.yes"), this.$t("shared.no")]) != 0) {
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
    log("Board Added", board.name);
    await this.getBoards();
    this.vTabBar.selectBoardByIndex(this.boards.length - 1);
  }
  get sortedBoards() {
    return this.boards.sort((a, b) => a.index - b.index);
  }
  @Watch("boards", { deep: true })
  changeBoard() {
    this.boards.forEach((board) => {
      this.updateBoard(board, false);
    });
  }
}
</script>
