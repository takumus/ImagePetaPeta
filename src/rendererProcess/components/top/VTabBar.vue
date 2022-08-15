<template>
  <t-tab-root>
    <t-tab
      :class="{ selected: b === board }"
      :style="{ opacity: b === board && dragging ? 0 : 1 }"
      v-for="(b, index) in boards"
      @pointerdown="pointerdown($event, b, index, $target)"
      @contextmenu="menu($event, b)"
      :key="b.id"
      :ref="(element) => setTabRef(element, b.id)"
    >
      <t-label-wrapper>
        <t-label>
          <VEditableLabel
            @change="(v) => changePetaBoardName(b, v)"
            :label="b.name"
          />
        </t-label>
      </t-label-wrapper>
    </t-tab>
    <t-tab
      class="add"
      @click="addPetaBoard()"
    >
      <t-label-wrapper>
        <t-label>
          <VEditableLabel :label="$texts.plus" :readonly="true"/>
        </t-label>
      </t-label-wrapper>
    </t-tab>
    <t-tab
      class="selected drag"
      ref="draggingTab"
      :style="{ display: dragging ? 'block' : 'none' }"
      v-show="dragging"
    >
      <t-label-wrapper>
        <t-label>
          <VEditableLabel :label="board.name" v-if="board" />
        </t-label>
      </t-label-wrapper>
    </t-tab>
  </t-tab-root>
</template>

<script lang="ts">
// Vue
import { Options, Vue } from "vue-class-component";
import { Prop, Ref, Watch } from "vue-property-decorator";
// Components
import VEditableLabel from "@/rendererProcess/components/utils/VEditableLabel.vue";
// Others
import { API } from "@/rendererProcess/api";
import { vec2FromPointerEvent } from "@/commons/utils/vec2";
import { PetaBoard } from "@/commons/datas/petaBoard";
import { MouseButton } from "@/commons/datas/mouseButton";
import { isKeyboardLocked } from "@/rendererProcess/utils/isKeyboardLocked";
@Options({
  components: {
    VEditableLabel
  },
  emits: [
    "remove",
    "add",
    "select",
    "sort",
    "change"
  ]
})
export default class VTabBar extends Vue {
  @Prop()
  boards!: PetaBoard[];
  @Prop()
  title = "";
  @Prop()
  currentPetaBoardId = "";
  @Ref("draggingTab")
  draggingTab!: HTMLElement;
  dragging = false;
  pressing = false;
  pointerdownOffsetX = 0;
  editName = false;
  beforeSortSelectedIndex = 0;
  afterSortSelectedIndex = 0;
  draggingPetaBoard: PetaBoard | undefined;
  tabs: { [key: string]: HTMLElement } = {};
  mounted() {
    window.addEventListener("pointermove", this.pointermove);
    window.addEventListener("pointerup", this.pointerup);
  }
  unmounted() {
    window.removeEventListener("pointermove", this.pointermove);
    window.removeEventListener("pointerup", this.pointerup);
  }
  pointerdown(event: PointerEvent, board: PetaBoard, index: number, target: HTMLElement) {
    if (isKeyboardLocked()) return;
    if (event.button != MouseButton.LEFT) return;
    this.selectPetaBoard(board);
    this.pressing = true;
    this.draggingPetaBoard = board;
    const rect = (event.currentTarget as HTMLElement)?.getBoundingClientRect();
    if (!rect) return;
    this.pointerdownOffsetX = rect.x - event.clientX;
    this.draggingTab.style.left = `${rect.x}px`;
    this.draggingTab.style.height = `${rect.height}px`;
    this.beforeSortSelectedIndex = index;
  }
  menu(event: PointerEvent, board: PetaBoard) {
    this.$components.contextMenu.open([{
      label: this.$t("tab.menu.remove", [board.name]),
      click: () => {
        this.removePetaBoard(board);
      }
    }], vec2FromPointerEvent(event));
  }
  pointermove(event: PointerEvent) {
    if (!this.pressing) return;
    if (this.dragging) {
      this.draggingTab.style.left = `${this.pointerdownOffsetX + event.clientX}px`;
      // ソート前の選択中ボードのインデックス
      const selectedPetaBoard = this.board;
      let newIndex = 0;
      this.boards
      .map((b) => {
        const elem: HTMLElement = b === this.draggingPetaBoard ? this.draggingTab : this.tabs[b.id]!;
        return {
          rect: elem.getBoundingClientRect(),
          board: b
        }
      })
      .sort((a, b) => (a.rect.x + a.rect.width / 2) - (b.rect.x + b.rect.width / 2))
      .forEach((b, index) => {
        b.board.index = index;
        // 選択中ボードのインデックス復元。
        if (b.board === selectedPetaBoard) {
          newIndex = index;
        }
      });
      this.afterSortSelectedIndex = newIndex;
    }
    this.dragging = true;
  }
  pointerup() {
    if (!this.pressing) return;
    this.dragging = false;
    this.pressing = false;
    if (this.beforeSortSelectedIndex != this.afterSortSelectedIndex) {
      this.$emit("sort");
    }
  }
  beforeUpdate() {
    this.tabs = {};
  }
  setTabRef(element: HTMLElement, id: string) {
    this.tabs[id] = element;
  }
  selectPetaBoard(board: PetaBoard) {
    this.$emit("select", board);
  }
  changePetaBoardName(board: PetaBoard, name: string) {
    if (name === "") {
      return;
    }
    board.name = name;
    this.$emit("change", board);
  }
  async removePetaBoard(board: PetaBoard) {
    this.$emit("remove", board);
  }
  async addPetaBoard() {
    this.$emit("add");
  }
  get board() {
    return this.boards.find((board) => board.id === this.currentPetaBoardId);
  }
  get isMac() {
    return this.$systemInfo.platform === "darwin";
  }
}
</script>

<style lang="scss" scoped>
t-tab-root {
  --tab-height: 24px;
  --top-draggable-height: 10px;
  top: 0px;
  left: 0px;
  background-color: var(--color-sub);
  color: var(--color-font);
  height: var(--tab-height);
  display: flex;
  >t-tab {
    display: block;
    margin: 0px;
    // border-right: solid 1px var(--color-border);
    // border-left: solid 1px;
    margin-right: -1px;
    flex-shrink: 1;
    cursor: pointer;
    overflow: hidden;
    position: relative;
    border-radius: var(--rounded);
    z-index: 1;
    &.drag {
      position: absolute;
      pointer-events: none;
      border-left: solid 1px var(--color-border);
    }
    &.add {
      min-width: 16px;
      border-right: none;
      flex-shrink: 0;
      >t-label-wrapper t-label {
        padding: 0px 8px;
      }
    }
    &:not(.selected):not(:hover) + t-tab:not(.selected):not(:hover) {
      &::after {
        content: '';
        display: block;
        position: absolute;
        width: 0px;
        border-left: solid 1px var(--color-border);
        // height: 100%;
        top: var(--rounded);
        bottom: var(--rounded);
        left: 0px;
        background-color: var(--color-border);
        border-radius: 1px;
      }
    }
    &.selected {
      z-index: 2;
      border-radius: var(--rounded) var(--rounded) 0px 0px;
      overflow: visible;
      background-color: var(--color-main);
      flex-shrink: 0;
      border: none;
      &:hover {
        background-color: var(--color-main);
      }
      &::before, &::after {
        content: '';
        display: inline-block;
        position: absolute;
        bottom: 0;
        left: calc(var(--rounded) * -1);
        width: var(--rounded);
        height: var(--rounded);
        border-radius: 0 0 100% 0;
        box-shadow: calc(var(--rounded) / 2) calc(var(--rounded) / 2) 0px calc(var(--rounded) * 0.2) var(--color-main);
      }
      &::after {
        left: unset;
        right: calc(var(--rounded) * -1);
        transform: scaleX(-1);
      }
    }
    &:hover:not(.selected) {
      background-color: var(--color-hover);
      overflow: visible;
      flex-shrink: 0;
      &::before, &::after {
        content: '';
        display: inline-block;
        position: absolute;
        bottom: 0;
        left: calc(var(--rounded) * -1);
        width: var(--rounded);
        height: var(--rounded);
        border-radius: 0 0 100% 0;
        box-shadow: calc(var(--rounded) / 2) calc(var(--rounded) / 2) 0px calc(var(--rounded) * 0.2) var(--color-hover);
      }
      &::after {
        left: unset;
        right: calc(var(--rounded) * -1);
        transform: scaleX(-1);
      }
    }
    >t-label-wrapper {
      display: flex;
      align-items: center;
      height: 100%;
      >t-label {
        padding: 0px 8px;
        flex-shrink: 1;
      }
    }
  }
}
</style>