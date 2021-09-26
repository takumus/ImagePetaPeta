<template>
  <section class="board-component">
    <VBoard
      v-if="currentPetaBoard"
      :board="currentPetaBoard"
      ref="vPetaBoard"
    />
  </section>
  <VBrowser
    :petaImages="petaImages"
    @addPanel="addPanel"
  />
  <VTabBar
    :boards="sortedPetaBoards"
    @remove="removePetaBoard"
    @add="addPetaBoard"
    @select="selectPetaBoard"
    ref="vTabBar"
  />
  <VImageImporter @addPanelByDragAndDrop="addPanelByDragAndDrop"/>
  <VImageCache />
  <VInfo ref="info"/>
  <VSettings />
  <VContextMenu />
  <VComplement />
  <article class="menu">
    <button tabindex="-1" @click="$globalComponents.settings.open">{{$t("home.settingsButton")}}</button>
    <button tabindex="-1" @click="$globalComponents.info.open">{{$t("home.infoButton")}}</button>
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
import VSettings from "@/components/utils/VSettings.vue";
// Others
import { API, log } from "@/api";
import { DEFAULT_BOARD_NAME, DEFAULT_IMAGE_SIZE, DOWNLOAD_URL, SAVE_DELAY } from "@/defines";
import { PetaImages } from "@/datas/petaImage";
import { PetaBoard, createPetaBoard, dbPetaBoardsToPetaBoards, petaBoardsToDBPetaBoards } from "@/datas/petaBoard";
import { ImportImageResult } from "@/datas/importImageResult";
import { PetaPanel, createPetaPanel } from "@/datas/petaPanel";
import { UpdateMode } from "@/datas/updateMode";
import { DelayUpdater } from "@/utils/delayUpdater";
import { Vec2, vec2FromMouseEvent } from "@/utils/vec2";
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
    VInfo,
    VSettings
  },
})
export default class App extends Vue {
  @Ref("vPetaBoard")
  vPetaBoard!: VBoard;
  @Ref("vTabBar")
  vTabBar!: VTabBar;
  petaImages: PetaImages = {};
  boards: PetaBoard[] = [];
  currentPetaBoard: PetaBoard | null = null;
  imageZIndex = 0;
  orderedAddPanelIds: string[] = [];
  orderedAddPanelDragEvent?: DragEvent;
  boardUpdaters: {[key: string]: DelayUpdater<PetaBoard>} = {};
  async mounted() {
    log("INIT RENDERER!");
    await this.getSettings();
    this.$globalComponents.importImages = () => {
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
      // log("on updatePetaImage", petaImage.id);
      // this.petaImages[petaImage.id] = petaImage;
    });
    API.send("checkUpdate").then(async (result) => {
      if (result.current.localeCompare(result.latest, "numeric") < 0) {
        if (await API.send("dialog", this.$t("utils.updateDialog", [result.current, result.latest]), [this.$t("shared.yes"), this.$t("shared.no")]) == 0) {
          API.send("openURL", `${DOWNLOAD_URL}${result.latest}`);
        }
      }
    });
    await this.getPetaImages();
    await this.getPetaBoards();
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
      if (!this.$globalComponents.browser.visible) {
        this.addPanel(panel);
      }
    });
    this.orderedAddPanelIds = [];
  }
  async getPetaBoards() {
    this.boards = await API.send("getPetaBoards");
    dbPetaBoardsToPetaBoards(this.boards, this.petaImages);
    this.boards.forEach((board) => {
      if (!this.boardUpdaters[board.id]) {
        this.boardUpdaters[board.id] = new DelayUpdater(SAVE_DELAY);
        this.boardUpdaters[board.id].initData(petaBoardsToDBPetaBoards(board));
        this.boardUpdaters[board.id].onUpdate((board) => {
          API.send("updatePetaBoards", [board], UpdateMode.UPDATE);
        });
      }
    })
  }
  addPanelByDragAndDrop(ids: string[], mouse: DragEvent) {
    this.orderedAddPanelIds = ids;
    this.orderedAddPanelDragEvent = mouse;
  }
  addPanel(petaPanel: PetaPanel, worldPosition?: Vec2) {
    if (!this.currentPetaBoard) return;
    this.currentPetaBoard.petaPanels.push(petaPanel);
    this.vPetaBoard.addPanel(petaPanel, worldPosition);
  }
  selectPetaBoard(board: PetaBoard) {
    log("PetaBoard Selected", board.name);
    if (this.currentPetaBoard) {
      this.$globalComponents
      this.updatePetaBoard(this.currentPetaBoard, true);
    }
    this.currentPetaBoard = board;
    this.$nextTick(() => {
      this.vPetaBoard.load();
    });
  }
  updatePetaBoard(board: PetaBoard, immidiately: boolean) {
    this.boardUpdaters[board.id].order(petaBoardsToDBPetaBoards(board));
    if (immidiately) {
      this.boardUpdaters[board.id].forceUpdate();
    }
  }
  async getSettings() {
    const settings = await API.send("getSettings");
    Object.keys(settings).forEach((key) => {
      (this.$settings as any)[key] = (settings as any)[key];
    });
  }
  async removePetaBoard(board: PetaBoard) {
    if (await API.send("dialog", this.$t("boards.removeDialog", [board.name]), [this.$t("shared.yes"), this.$t("shared.no")]) != 0) {
      return;
    }
    this.boardUpdaters[board.id].forceUpdate();
    await API.send("updatePetaBoards", [board], UpdateMode.REMOVE);
    await this.getPetaBoards();
  }
  async addPetaBoard() {
    const basename = DEFAULT_BOARD_NAME;
    const names = this.boards.map((b) => b.name);
    let name = basename;
    for (let i = 2; names.includes(name); i++) {
      name = basename + (i > 0 ? `(${i})` : "");
    }
    const board = createPetaBoard(name, Math.max(...this.boards.map((b) => b.index), 0) + 1);
    await API.send(
      "updatePetaBoards",
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
  @Watch("boards", { deep: true })
  changePetaBoard() {
    this.boards.forEach((board) => {
      this.updatePetaBoard(board, false);
    });
  }
}
</script>
