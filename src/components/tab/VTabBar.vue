<template>
  <article
    class="tab-root"
    :style="{
      zIndex: zIndex
    }"
  >
    <section
      class="titlebar"
      v-if="customTitlebar"
    >
      <section class="draggable">
        {{title}}
      </section>
      <section class="window-buttons">
        <span
          @click="minimizeWindow"
          class="window-button"
        >
          &#xe921;
        </span>
        <span
          @click="maximizeWindow"
          class="window-button">
            &#xe922;
          </span>
        <span
          @click="closeWindow"
          class="window-button close">
            &#xe8bb;
          </span>
      </section>
    </section>
    <section
      class="tab"
      v-show="!hide"
    >
      <span
        class="button"
        :class="{ selected: b == board }"
        :style="{ opacity: b == board && dragging ? 0 : 1 }"
        v-for="(b, index) in boards"
        :key="b.id"
        :ref="`tab-${b.id}`"
      >
        <span class="wrapper">
          <span
            class="label"
            @mousedown="mousedown($event, index, $target)"
            @contextmenu="menu($event, b)"
          >
            <VEditableLabel
              @change="(v) => changePetaBoardName(b, v)"
              :label="b.name"
            />
          </span>
          <span
            class="remove"
            v-if="removable"
          >
            <span @click="removePetaBoard(b)">×</span>
          </span>
        </span>
      </span>
      <span
        class="button add"
        @click="addPetaBoard()"
      >
        <span class="wrapper">
          <span class="label">+</span>
        </span>
      </span>
      <span class="draggable">
      </span>
      <span
        class="button selected drag"
        ref="draggingTab"
        :style="{ display: dragging ? 'block' : 'none' }"
        v-if="board"
      >
        <span class="wrapper">
          <span class="label">
            <VEditableLabel :label="board.name" />
          </span>
          <span
            class="remove"
            v-if="removable"
          >
            ×
          </span>
        </span>
      </span>
      <span class="buttons">
        <button
          tabindex="-1"
          @click="$globalComponents.importImages"
        >
          {{$t("home.importImagesButton")}}
        </button>
        <button
          tabindex="-1"
          @click="$globalComponents.browser.open()"
        >
          {{$t("home.openBrowserButton")}}
        </button>
      </span>
    </section>
  </article>
</template>

<script lang="ts">
// Vue
import { Options, Vue } from "vue-class-component";
import { Prop, Ref, Watch } from "vue-property-decorator";
// Components
import VEditableLabel from "@/components/utils/VEditableLabel.vue";
// Others
import { API, log } from "@/api";
import { vec2FromMouseEvent } from "@/utils/vec2";
import { PetaBoard } from "@/datas/petaBoard";
import { MouseButton } from "@/datas/mouseButton";
@Options({
  components: {
    VEditableLabel
  },
  emits: [
    "remove",
    "add",
    "select",
    "sort",
  ]
})
export default class VTabBar extends Vue {
  @Prop()
  boards!: PetaBoard[];
  @Prop()
  customTitlebar = false;
  @Prop()
  hide = false;
  @Prop()
  title = "";
  @Prop()
  zIndex = 0;
  @Ref("draggingTab")
  draggingTab!: HTMLElement;
  dragging = false;
  pressing = false;
  mousedownOffsetX = 0;
  editName = false;
  selectedIndex = 0;
  beforeSortSelectedIndex = 0;
  draggingPetaBoard!: PetaBoard;
  mounted() {
    window.addEventListener("mousemove", this.mousemove);
    window.addEventListener("mouseup", this.mouseup);
  }
  unmounted() {
    window.removeEventListener("mousemove", this.mousemove);
    window.removeEventListener("mouseup", this.mouseup);
  }
  mousedown(event: MouseEvent, index: number) {
    if (event.button != MouseButton.LEFT) return;
    this.selectPetaBoardByIndex(index);
    this.pressing = true;
    this.draggingPetaBoard = this.board;
    const rect = (event.target as HTMLElement).parentElement?.parentElement?.getBoundingClientRect();
    if (!rect) return;
    this.mousedownOffsetX = rect.x - event.clientX;
    this.draggingTab.style.left = `${rect.x}px`;
    this.beforeSortSelectedIndex = this.selectedIndex;
  }
  menu(event: MouseEvent, board: PetaBoard) {
    this.$globalComponents.contextMenu.open([{
      label: this.$t("tab.menu.remove", [board.name]),
      click: () => {
        this.removePetaBoard(board);
      }
    }], vec2FromMouseEvent(event));
  }
  mousemove(event: MouseEvent) {
    if (!this.pressing) return;
    if (this.dragging) {
      this.draggingTab.style.left = `${this.mousedownOffsetX + event.clientX}px`;
      // ソート前の選択中ボードのインデックス
      const selectedPetaBoard = this.board;
      let newIndex = 0;
      this.boards
      .map((b) => {
        const elem: HTMLElement = b == this.draggingPetaBoard ? this.draggingTab : (this.$refs[`tab-${b.id}`] as HTMLElement);
        return {
          rect: elem.getBoundingClientRect(),
          board: b
        }
      })
      .sort((a, b) => (a.rect.x + a.rect.width / 2) - (b.rect.x + b.rect.width / 2))
      .forEach((b, index) => {
        b.board.index = index;
        // 選択中ボードのインデックス復元。
        if (b.board == selectedPetaBoard) {
          newIndex = index;
        }
      });
      this.selectedIndex = newIndex;
    }
    this.dragging = true;
  }
  mouseup() {
    if (!this.pressing) return;
    this.dragging = false;
    this.pressing = false;
    if (this.beforeSortSelectedIndex != this.selectedIndex) {
      this.$emit("sort");
    }
  }
  selectPetaBoardByIndex(index: number, force = false) {
    if (this.boards.length == 0) return;
    const prevPetaBoard = this.boards[this.selectedIndex];
    this.selectedIndex = index;
    if (this.selectedIndex >= this.boards.length) {
      this.selectedIndex = this.boards.length - 1;
    } else if (index < 0) {
      this.selectedIndex = 0;
    }
    const currentPetaBoard = this.boards[this.selectedIndex];
    if (currentPetaBoard != prevPetaBoard || force) {
      if (!currentPetaBoard) return;
      this.$emit("select", currentPetaBoard);
    }
  }
  changePetaBoardName(board: PetaBoard, name: string) {
    name = name.trim();
    if (name == "") {
      name = board.name;
    }
    log(board.name, "->", name);
    board.name = name;
  }
  minimizeWindow() {
    API.send("windowMinimize");
  }
  maximizeWindow() {
    API.send("windowMaximize");
  }
  closeWindow() {
    API.send("windowClose");
  }
  async removePetaBoard(board: PetaBoard) {
    this.$emit("remove", board);
  }
  async addPetaBoard() {
    this.$emit("add");
  }
  get board() {
    return this.boards[this.selectedIndex];
  }
  get removable() {
    return true;// this.boards.length > 1;
  }
  @Watch("boards", { deep: true, immediate: true })
  changePetaBoards(n?: PetaBoard[], o?: PetaBoard[]) {
    // idの並びと長さの変更のみ検知したい。これしか思いつかなかった。
    const nIds = n?.map((b) => b.id).join(",");
    const oIds = o?.map((b) => b.id).join(",");
    if(nIds != oIds) {
      this.selectPetaBoardByIndex(this.selectedIndex, true);
    }
  }
}
</script>

<style lang="scss" scoped>
.tab-root {
  --tab-height: 16px;
  position: fixed;
  top: 0px;
  left: 0px;
  width: 100%;
  .titlebar {
    width: 100%;
    background-color: var(--tab-bg-color);
    height: var(--tab-height);
    text-align: right;
    display: flex;
    .draggable {
      flex-grow: 1;
      -webkit-app-region: drag;
      text-align: left;
      display: inline-block;
      padding-left: 2px;
      line-height: var(--tab-height);
      font-size: 0.8em;
    }
    .window-buttons {
      .window-button {
        font-size: 6px;
        display: inline-block;
        padding: 0px 16px;
        line-height: var(--tab-height);
        font-family: Segoe MDL2 Assets;
        &:hover {
          background-color: var(--window-buttons-hover);
          &.close {
            color: #ffffff;
            background-color: var(--window-buttons-close-hover);
          }
        }
      }
    }
  }
  .tab {
    width: 100%;
    background-color: var(--tab-bg-color);
    color: var(--font-color);
    box-shadow: -1px 2px 2px 0px rgba(0, 0, 0, 0.2);
    display: flex;
    .draggable {
      -webkit-app-region: drag;
      flex-grow: 1;
    }
    .buttons {
      button {
        padding: 0px 8px;
        height: auto;
      }
    }
    .button {
      display: block;
      margin: 0px;
      border-right: solid 1px var(--tab-border-color);
      // border-left: solid 1px;
      margin-right: -1px;
      flex-shrink: 1;
      cursor: pointer;
      overflow: hidden;
      &.drag {
        position: absolute;
        pointer-events: none;
        border-left: solid 1px var(--tab-border-color);
      }
      &.add {
        min-width: 16px;
        border-right: none;
        flex-shrink: 0;
        .wrapper .label {
          padding: 8px;
        }
      }
      &:hover .wrapper .remove {
        visibility: visible;
      }
      &.selected {
        background-color: var(--tab-selected-color);
        flex-shrink: 0;
        border-left: solid 1px var(--tab-border-color);
        .wrapper {
          .remove {
            visibility: visible;
          }
        }
      }
      .wrapper {
        display: flex;
        .label {
          padding: 8px;
          padding-right: 0px;
          flex-shrink: 1;
          overflow: hidden;
        }
        .remove {
          visibility: hidden;
          text-align: right;
          padding: 8px;
          flex-shrink: 0;
        }
      }
    }
    .buttons {
      position: relative;
      display: flex;
      flex-shrink: 1;
      right: 0px;
      text-align: right;
      justify-content: flex-end;
      button {
        min-width: 0px;
      }
    }
  }
}
</style>