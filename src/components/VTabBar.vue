<template>
  <article class="tab">
    <span
      class="button"
      :class="{ selected: b == board }"
      :style="{ opacity: b == board && dragging ? 0 : 1 }"
      v-for="(b, index) in boards"
      :key="b.id"
      :ref="`tab-${b.id}`"
    >
      <span class="wrapper">
        <span class="label" @mousedown="mousedown($event, index, $target)" @contextmenu="menu($event, b)">
          <VEditableLabel @change="(v) => changeBoardName(b, v)" :label="b.name"/>
        </span>
        <span
          class="remove"
          v-if="removable"
        >
          <span @click="removeBoard(b)">×</span>
        </span>
      </span>
    </span>
    <span
      class="button add"
      @click="addBoard()"
    >
      <span class="wrapper">
        <span class="label">+</span>
      </span>
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
      <button tabindex="-1" @click="openSettings">Settings</button>
      <button tabindex="-1" @click="openInfo">Info</button>
    </span>
  </article>
</template>

<style lang="scss" scoped>
.tab {
  position: fixed;
  z-index: 2;
  top: 0px;
  left: 0px;
  text-align: left;
  width: 100%;
  background-color: #eeeeee;
  line-height: 1.0em;
  font-size: 1.0em;
  display: flex;
  .button {
    display: block;
    margin: 0px;
    border-right: solid 1px #cccccc;
    border-left: solid 1px #cccccc;
    margin-right: -1px;
    flex-shrink: 1;
    background-color: #eeeeee;
    cursor: pointer;
    overflow: hidden;
    &.drag {
      position: absolute;
      pointer-events: none;
    }
    &.add {
      min-width: 16px;
      border-right: none;
      flex-shrink: 0;
      .wrapper .label {
        padding: 12px;
      }
    }
    &:hover .wrapper .remove {
      visibility: visible;
    }
    &.selected {
      background-color: #ffffff;
      flex-shrink: 0;
      .wrapper {
        .remove {
          visibility: visible;
        }
      }
    }
    .wrapper {
      display: flex;
      .label {
        padding: 12px;
        padding-right: 0px;
        flex-shrink: 1;
        overflow: hidden;
        color: #333333;
      }
      .remove {
        visibility: hidden;
        text-align: right;
        color: #333333;
        padding: 12px;
        flex-shrink: 0;
      }
    }
  }
  .buttons {
    position: relative;
    display: flex;
    flex-grow: 1;
    right: 0px;
    text-align: right;
    justify-content: flex-end;
    button {
      min-width: 0px;
    }
  }
}
</style>

<script lang="ts">
// Vue
import { Options, Vue } from "vue-class-component";
import { Prop, Ref, Watch } from "vue-property-decorator";
// Components
import VEditableLabel from "@/components/utils/VEditableLabel.vue";
// Others
import GLOBALS from "@/globals";
import { log } from "@/api";
import { Board, MouseButton } from "@/datas";
import { vec2FromMouseEvent } from "@/utils";
@Options({
  components: {
    VEditableLabel
  },
  emits: [
    "remove",
    "add",
    "select",
    "sort",
    "openInfo",
    "openSettings"
  ]
})
export default class VTabBar extends Vue {
  @Prop()
  boards!: Board[];
  @Ref("draggingTab")
  draggingTab!: HTMLElement;
  dragging = false;
  pressing = false;
  mousedownOffsetX = 0;
  editName = false;
  selectedIndex = 0;
  beforeSortSelectedIndex = 0;
  draggingBoard!: Board;
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
    this.selectBoardByIndex(index);
    this.pressing = true;
    this.draggingBoard = this.board;
    const rect = (event.target as HTMLElement).parentElement?.parentElement?.getBoundingClientRect();
    if (!rect) return;
    this.mousedownOffsetX = rect.x - event.clientX;
    this.draggingTab.style.left = `${rect.x}px`;
    this.beforeSortSelectedIndex = this.selectedIndex;
  }
  menu(event: MouseEvent, board: Board) {
    GLOBALS.contextMenu.open([{
      label: `Remove "${board.name}"`,
      click: () => {
        this.removeBoard(board);
      }
    }], vec2FromMouseEvent(event));
  }
  mousemove(event: MouseEvent) {
    if (!this.pressing) return;
    if (this.dragging) {
      this.draggingTab.style.left = `${this.mousedownOffsetX + event.clientX}px`;
      // ソート前の選択中ボードのインデックス
      const selectedBoard = this.board;
      let newIndex = 0;
      this.boards
      .map((b) => {
        const elem: HTMLElement = b == this.draggingBoard ? this.draggingTab : (this.$refs[`tab-${b.id}`] as HTMLElement);
        return {
          rect: elem.getBoundingClientRect(),
          board: b
        }
      })
      .sort((a, b) => (a.rect.x + a.rect.width / 2) - (b.rect.x + b.rect.width / 2))
      .forEach((b, index) => {
        b.board.index = index;
        // 選択中ボードのインデックス復元。
        if (b.board == selectedBoard) {
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
  selectBoardByIndex(index: number, force = false) {
    if (this.boards.length == 0) return;
    const prevBoard = this.boards[this.selectedIndex];
    this.selectedIndex = index;
    if (this.selectedIndex >= this.boards.length) {
      this.selectedIndex = this.boards.length - 1;
    } else if (index < 0) {
      this.selectedIndex = 0;
    }
    const currentBoard = this.boards[this.selectedIndex];
    if (currentBoard != prevBoard || force) {
      if (!currentBoard) return;
      this.$emit("select", currentBoard);
    }
  }
  changeBoardName(board: Board, name: string) {
    name = name.trim();
    if (name == "") {
      name = board.name;
    }
    log(board.name, "->", name);
    board.name = name;
  }
  openSettings() {
    this.$emit("openSettings");
  }
  openInfo() {
    this.$emit("openInfo");
  }
  async removeBoard(board: Board) {
    this.$emit("remove", board);
  }
  async addBoard() {
    this.$emit("add");
  }
  get board() {
    return this.boards[this.selectedIndex];
  }
  get removable() {
    return true;// this.boards.length > 1;
  }
  @Watch("boards", { deep: true, immediate: true })
  changeBoards(n?: Board[], o?: Board[]) {
    // idの並びと長さの変更のみ検知したい。これしか思いつかなかった。
    const nIds = n?.map((b) => b.id).join(",");
    const oIds = o?.map((b) => b.id).join(",");
    if(nIds != oIds) {
      this.selectBoardByIndex(this.selectedIndex, true);
    }
  }
}
</script>
