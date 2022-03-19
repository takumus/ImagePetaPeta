<template>
  <article
    class="tab-root"
    :style="{
      zIndex: zIndex
    }"
  >
    <section
      class="titlebar"
    >
      <section class="titlebar-and-tab">
        <section class="draggable">
          <!-- {{title}} -->
        </section>
        <section
          class="tabs"
          :class="{
            mac: isMac
          }"
          v-show="uiVisible"
        >
          <span
            class="draggable left"
            :class="{
              mac: $systemInfo.platform == 'darwin'
            }"
          >
          </span>
          <span
            class="tab"
            :class="{ selected: b == board }"
            :style="{ opacity: b == board && dragging ? 0 : 1 }"
            v-for="(b, index) in boards"
            @mousedown="mousedown($event, b, index, $target)"
            @contextmenu="menu($event, b)"
            :key="b.id"
            :ref="`tab-${b.id}`"
          >
            <span class="wrapper">
              <span class="label">
                <VEditableLabel
                  @change="(v) => changePetaBoardName(b, v)"
                  :label="b.name"
                />
              </span>
            </span>
          </span>
          <span
            class="tab add"
            @click="addPetaBoard()"
          >
            <span class="wrapper">
              <span class="label">
                <VEditableLabel :label="$texts.plus" :readonly="true"/>
              </span>
            </span>
          </span>
          <span class="draggable">
          </span>
          <span
            class="tab selected drag"
            ref="draggingTab"
            :style="{ display: dragging ? 'block' : 'none' }"
            v-show="dragging"
          >
            <span class="wrapper">
              <span class="label">
                <VEditableLabel :label="board.name" v-if="board" />
              </span>
            </span>
          </span>
        </section>
      </section>
      <section
        class="window-buttons"
        v-if="!isMac"
      >
        <span
          @click="minimizeWindow"
          class="window-button"
        >
          <span class="icon">&#xe921;</span>
        </span>
        <span
          @click="maximizeWindow"
          class="window-button">
            <span class="icon">&#xe922;</span>
          </span>
        <span
          @click="closeWindow"
          class="window-button close">
            <span class="icon">&#xe8bb;</span>
          </span>
      </section>
    </section>
    <section class="tab-bottom" v-show="uiVisible">
      <article v-if="board" class="board-parameters">
        <!-- ズーム率 -->
        <button
          tabindex="-1"
          @click="board.transform.scale = 1"
        >
          {{Math.floor(board.transform.scale * 100)}}%
        </button>
        <!-- 塗り色 -->
        <button
          class="color"
          tabindex="-1"
          :style="{
            backgroundColor: board.background.fillColor
          }"
          @click="$refs['inputFillColor'].click()"
        >
          &nbsp;
        </button>
        <input
          type="color"
          v-model="board.background.fillColor"
          tabindex="-1"
          ref="inputFillColor"
        >
        <!-- 線色 -->
        <button
          class="color"
          tabindex="-1"
          :style="{
            backgroundColor: board.background.lineColor
          }"
          @click="$refs['inputLineColor'].click()"
        >
          &nbsp;
        </button>
        <input
          type="color"
          v-model="board.background.lineColor"
          tabindex="-1"
          ref="inputLineColor"
        >
      </article>
      <article class="shared-buttons left">
        <button
          tabindex="-1"
          @click="$components.browser.open()"
        >
          {{$t("home.openBrowserButton")}}
        </button>
        <button
          tabindex="-1"
          @click="$api.send('importImageFiles')"
        >
          {{$t("home.importImagesFromFilesButton")}}
        </button>
        <button
          tabindex="-1"
          @click="$api.send('importImageDirectories')"
        >
          {{$t("home.importImagesFromDirectoriesButton")}}
        </button>
      </article>
      <article class="shared-buttons right">
        <button
          tabindex="-1"
          @click="$components.info.open"
        >
        {{$t("home.infoButton")}}
        </button>
        <button
          tabindex="-1"
          @click="$components.settings.open"
        >
        {{$t("home.settingsButton")}}
        </button>
      </article>
    </section>
  </article>
</template>

<script lang="ts">
// Vue
import { Options, Vue } from "vue-class-component";
import { Prop, Ref, Watch } from "vue-property-decorator";
// Components
import VEditableLabel from "@/rendererProcess/components/utils/VEditableLabel.vue";
// Others
import { API } from "@/rendererProcess/api";
import { vec2FromMouseEvent } from "@/commons/utils/vec2";
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
  uiVisible = true;
  @Prop()
  title = "";
  @Prop()
  zIndex = 0;
  @Prop()
  currentPetaBoardId = "";
  @Ref("draggingTab")
  draggingTab!: HTMLElement;
  dragging = false;
  pressing = false;
  mousedownOffsetX = 0;
  editName = false;
  beforeSortSelectedIndex = 0;
  afterSortSelectedIndex = 0;
  draggingPetaBoard: PetaBoard | undefined;
  mounted() {
    window.addEventListener("mousemove", this.mousemove);
    window.addEventListener("mouseup", this.mouseup);
  }
  unmounted() {
    window.removeEventListener("mousemove", this.mousemove);
    window.removeEventListener("mouseup", this.mouseup);
  }
  mousedown(event: MouseEvent, board: PetaBoard, index: number, target: HTMLElement) {
    if (isKeyboardLocked()) return;
    if (event.button != MouseButton.LEFT) return;
    this.selectPetaBoard(board);
    this.pressing = true;
    this.draggingPetaBoard = board;
    const rect = (event.currentTarget as HTMLElement)?.getBoundingClientRect();
    if (!rect) return;
    this.mousedownOffsetX = rect.x - event.clientX;
    this.draggingTab.style.left = `${rect.x}px`;
    this.draggingTab.style.height = `${rect.height}px`;
    this.beforeSortSelectedIndex = index;
  }
  menu(event: MouseEvent, board: PetaBoard) {
    this.$components.contextMenu.open([{
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
      this.afterSortSelectedIndex = newIndex;
    }
    this.dragging = true;
  }
  mouseup() {
    if (!this.pressing) return;
    this.dragging = false;
    this.pressing = false;
    if (this.beforeSortSelectedIndex != this.afterSortSelectedIndex) {
      this.$emit("sort");
    }
  }
  selectPetaBoard(board: PetaBoard) {
    this.$emit("select", board);
  }
  changePetaBoardName(board: PetaBoard, name: string) {
    if (name == "") {
      return;
    }
    board.name = name;
    this.$emit("change", board);
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
    return this.boards.find((board) => board.id == this.currentPetaBoardId);
  }
  get isMac() {
    return this.$systemInfo.platform == "darwin";
  }
}
</script>

<style lang="scss" scoped>
.tab-root {
  --tab-height: 24px;
  --top-draggable-height: 10px;
  position: fixed;
  top: 0px;
  left: 0px;
  width: 100%;
  >.titlebar {
    width: 100%;
    background-color: var(--tab-bg-color);
    min-height: var(--tab-height);
    text-align: right;
    display: flex;
    >.titlebar-and-tab {
      flex-grow: 1;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      >.draggable {
        flex-grow: 1;
        -webkit-app-region: drag;
        display: block;
        height: var(--top-draggable-height);
      }
      >.tabs {
        width: 100%;
        background-color: var(--tab-bg-color);
        color: var(--font-color);
        height: var(--tab-height);
        display: flex;
        >.draggable {
          -webkit-app-region: drag;
          flex-grow: 1;
          &.left {
            flex-grow: 0;
            width: calc(var(--tab-height) + var(--top-draggable-height));
            &.mac {
              width: calc(var(--tab-height) + var(--top-draggable-height) + 30px);
            }
          }
        }
        >.tab {
          display: block;
          margin: 0px;
          // border-right: solid 1px var(--tab-border-color);
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
            border-left: solid 1px var(--tab-border-color);
          }
          &.add {
            min-width: 16px;
            border-right: none;
            flex-shrink: 0;
            .wrapper .label {
              padding: 0px 8px;
            }
          }
          &.selected {
            z-index: 2;
            border-radius: var(--rounded) var(--rounded) 0px 0px;
            overflow: visible;
            background-color: var(--tab-selected-color);
            flex-shrink: 0;
            border: none;
            &:hover {
              background-color: var(--tab-selected-color);
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
              box-shadow: calc(var(--rounded) / 2) calc(var(--rounded) / 2) 0px calc(var(--rounded) * 0.2) var(--tab-selected-color);
            }
            &::after {
              left: unset;
              right: calc(var(--rounded) * -1);
              transform: scaleX(-1);
            }
          }
          &:hover:not(.selected) {
            background-color: var(--tab-hovered-color);
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
              box-shadow: calc(var(--rounded) / 2) calc(var(--rounded) / 2) 0px calc(var(--rounded) * 0.2) var(--tab-hovered-color);
            }
            &::after {
              left: unset;
              right: calc(var(--rounded) * -1);
              transform: scaleX(-1);
            }
          }
          >.wrapper {
            display: flex;
            align-items: center;
            height: 100%;
            >.label {
              padding: 0px 8px;
              flex-shrink: 1;
            }
          }
        }
      }
    }
    >.window-buttons {
      display: flex;
      >.window-button {
        display: flex;
        padding: 0px 16px;
        align-items: center;
        >.icon {
          display: inline-block;
          font-size: 6px;
          font-family: Segoe MDL2 Assets;
        }
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
  >.tab-bottom {
    width: 100%;
    background-color: var(--tab-selected-color);
    height: 30px;
    box-shadow: -1px 2px 2px 0px rgba(0, 0, 0, 0.4);
    position: relative;
    border-bottom: solid 1px var(--bg-color);
    button {
      min-width: 0px;
      padding: 0px 6px;
      height: 100%;
      margin: 0px;
    }
    >.shared-buttons {
      position: absolute;
      top: 0px;
      height: 100%;
      padding: 4px;
      display: flex;
      flex-shrink: 1;
      text-align: left;
      justify-content: flex-end;
      &.left {
        left: 0px;
        button {
          margin-right: 4px;
        }
      }
      &.right {
        right: 0px;
        button {
          margin-left: 4px;
        }
      }
    }
    >.board-parameters {
      position: absolute;
      top: 0px;
      left: 0px;
      height: 100%;
      width: 100%;
      padding: 4px;
      padding-left: 6px;
      text-align: center;
      >input {
        display: inline-block;
        width: 0px;
        height: 0px;
        overflow: hidden;
        position: relative;
        margin: 0px;
        padding: 0px;
        border: none;
      }
      >button {
        min-width: 50px;
        margin-right: 4px;
        &.color {
          border-radius: 100px;
          width: auto;
          min-width: 0px;
          aspect-ratio: 1;
        }
      }
    }
  }
}
</style>