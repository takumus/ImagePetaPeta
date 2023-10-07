<template>
  <e-tab-root>
    <e-tab
      :class="{ selected: b === board }"
      :style="{ opacity: b === board && dragging ? 0 : 1 }"
      v-for="(b, index) in boards"
      @pointerdown="pointerdown($event, b, index)"
      @contextmenu="menu($event, b)"
      :key="b.id"
      :ref="(element: HTMLElement) => setTabRef(element, b.id)">
      <e-label-wrapper>
        <e-label>
          <VTextarea
            :type="'single'"
            :trim="true"
            :value="b.name"
            @update:value="(v) => changePetaBoardName(b, v)" />
        </e-label>
      </e-label-wrapper>
    </e-tab>
    <e-tab class="add" @click="addPetaBoard()">
      <e-label-wrapper>
        <e-label>
          <VTextarea
            :type="'single'"
            :trim="true"
            :readonly="true"
            :value="textsStore.state.value.plus" />
        </e-label>
      </e-label-wrapper>
    </e-tab>
    <e-tab
      class="selected drag"
      ref="draggingTab"
      :style="{ display: dragging ? 'block' : 'none' }"
      v-show="dragging">
      <e-label-wrapper>
        <e-label>
          <VTextarea
            :type="'single'"
            :trim="true"
            :readonly="true"
            :value="board.name"
            v-if="board" />
        </e-label>
      </e-label-wrapper>
    </e-tab>
  </e-tab-root>
</template>

<script setup lang="ts">
import { computed, onBeforeUpdate, onMounted, onUnmounted, ref } from "vue";
import { useI18n } from "vue-i18n";

import VTextarea from "@/renderer/components/commons/utils/textarea/VTextarea.vue";

import { MouseButton } from "@/commons/datas/mouseButton";
import { RPetaBoard } from "@/commons/datas/rPetaBoard";
import { vec2FromPointerEvent } from "@/commons/utils/vec2";

import { useComponentsStore } from "@/renderer/stores/componentsStore/useComponentsStore";
import { useTextsStore } from "@/renderer/stores/textsStore/useTextsStore";
import { isKeyboardLocked } from "@/renderer/utils/isKeyboardLocked";

const emit = defineEmits<{
  (e: "add"): void;
  (e: "remove", board: RPetaBoard): void;
  (e: "select", board: RPetaBoard): void;
  (e: "update:board", board: RPetaBoard): void;
}>();
const props = defineProps<{
  boards: RPetaBoard[];
  currentPetaBoardId: string;
}>();
const textsStore = useTextsStore();
const components = useComponentsStore();
const { t } = useI18n();
const draggingTab = ref<HTMLElement>();
const dragging = ref(false);
const pressing = ref(false);
const pointerdownOffsetX = ref(0);
const beforeSortSelectedIndex = ref(0);
const afterSortSelectedIndex = ref(0);
const draggingPetaBoardId = ref<string>();
const tabs = ref<{ [key: string]: HTMLElement }>({});
onMounted(() => {
  window.addEventListener("pointermove", pointermove);
  window.addEventListener("pointerup", pointerup);
});
onUnmounted(() => {
  window.removeEventListener("pointermove", pointermove);
  window.removeEventListener("pointerup", pointerup);
});
function pointerdown(event: PointerEvent, board: RPetaBoard, index: number) {
  if (isKeyboardLocked()) return;
  if (event.button !== MouseButton.LEFT) return;
  selectPetaBoard(board);
  pressing.value = true;
  draggingPetaBoardId.value = board.id;
  const rect = (event.currentTarget as HTMLElement)?.getBoundingClientRect();
  if (!rect) return;
  pointerdownOffsetX.value = rect.x - event.clientX;
  if (draggingTab.value) {
    draggingTab.value.style.left = `${rect.x}px`;
    draggingTab.value.style.height = `${rect.height}px`;
  }
  beforeSortSelectedIndex.value = index;
}
function menu(event: PointerEvent, board: RPetaBoard) {
  components.contextMenu.open(
    [
      {
        label: t("tab.menu.remove", [board.name]),
        click: () => {
          removePetaBoard(board);
        },
      },
    ],
    vec2FromPointerEvent(event),
  );
}
function pointermove(event: PointerEvent) {
  if (!pressing.value) return;
  const _draggingTab = draggingTab.value;
  if (_draggingTab === undefined) {
    return;
  }
  if (dragging.value) {
    _draggingTab.style.left = `${pointerdownOffsetX.value + event.clientX}px`;
    // ソート前の選択中ボードのインデックス
    const selectedPetaBoard = board.value;
    let newIndex = 0;
    props.boards
      .map((b) => {
        const elem = b.id === draggingPetaBoardId.value ? _draggingTab : tabs.value[b.id];
        return {
          rect: elem?.getBoundingClientRect() || { x: 0, y: 0, height: 0, width: 0 },
          board: b,
        };
      })
      .sort((a, b) => a.rect.x + a.rect.width / 2 - (b.rect.x + b.rect.width / 2))
      .forEach((b, index) => {
        if (b.board.index !== index) {
          emit("update:board", {
            ...b.board,
            index,
          });
        }
        // 選択中ボードのインデックス復元。
        if (b.board.id === selectedPetaBoard?.id) {
          newIndex = index;
        }
      });
    afterSortSelectedIndex.value = newIndex;
  }
  dragging.value = true;
}
function pointerup() {
  if (!pressing.value) return;
  dragging.value = false;
  pressing.value = false;
}
onBeforeUpdate(() => {
  tabs.value = {};
});
function setTabRef(element: HTMLElement, id: string) {
  tabs.value[id] = element;
}
function selectPetaBoard(board: RPetaBoard) {
  emit("select", board);
}
function changePetaBoardName(board: RPetaBoard, name: string) {
  if (name === "") {
    return;
  }
  emit("update:board", {
    ...board,
    name,
  });
}
async function removePetaBoard(board: RPetaBoard) {
  emit("remove", board);
}
async function addPetaBoard() {
  emit("add");
}
const board = computed(() => {
  return props.boards.find((board) => board.id === props.currentPetaBoardId);
});
</script>

<style lang="scss" scoped>
e-tab-root {
  display: flex;
  top: 0px;
  left: 0px;
  background-color: var(--color-1);
  height: var(--tab-height);
  color: var(--color-font);
  > e-tab {
    display: block;
    position: relative;
    flex-shrink: 1;
    z-index: 1;
    cursor: pointer;
    margin: 0px;
    // border-right: solid 1px var(--color-border);
    // border-left: solid 1px;
    margin-right: -1px;
    border-radius: var(--rounded);
    overflow: hidden;
    &.drag {
      position: absolute;
      border-left: solid var(--px-border) var(--color-border);
      pointer-events: none;
    }
    &.add {
      flex-shrink: 0;
      border-right: none;
      min-width: var(--px-3);
      > e-label-wrapper e-label {
        padding: 0px var(--px-2);
      }
    }
    &:not(.selected):not(:hover) + e-tab:not(.selected):not(:hover) {
      &::after {
        display: block;
        position: absolute;
        // height: 100%;
        top: var(--rounded);
        bottom: var(--rounded);
        left: 0px;
        border-left: solid 1px var(--color-border);
        border-radius: 1px;
        background-color: var(--color-border);
        width: 0px;
        content: "";
      }
    }
    &.selected {
      flex-shrink: 0;
      z-index: 2;
      border: none;
      border-radius: var(--rounded) var(--rounded) 0px 0px;
      background-color: var(--color-0);
      overflow: visible;
      &:hover {
        background-color: var(--color-0);
      }
      &::before,
      &::after {
        display: inline-block;
        position: absolute;
        bottom: 0;
        left: calc(var(--rounded) * -1);
        box-shadow: calc(var(--rounded) / 2) calc(var(--rounded) / 2) 0px calc(var(--rounded) * 0.2)
          var(--color-0);
        border-radius: 0 0 100% 0;
        width: var(--rounded);
        height: var(--rounded);
        content: "";
      }
      &::after {
        right: calc(var(--rounded) * -1);
        left: unset;
        transform: scaleX(-1);
      }
    }
    &:hover:not(.selected) {
      flex-shrink: 0;
      background-color: var(--color-2);
      overflow: visible;
      &::before,
      &::after {
        display: inline-block;
        position: absolute;
        bottom: 0;
        left: calc(var(--rounded) * -1);
        box-shadow: calc(var(--rounded) / 2) calc(var(--rounded) / 2) 0px calc(var(--rounded) * 0.2)
          var(--color-2);
        border-radius: 0 0 100% 0;
        width: var(--rounded);
        height: var(--rounded);
        content: "";
      }
      &::after {
        right: calc(var(--rounded) * -1);
        left: unset;
        transform: scaleX(-1);
      }
    }
    > e-label-wrapper {
      display: flex;
      align-items: center;
      height: 100%;
      > e-label {
        flex-shrink: 1;
        padding: 0px var(--px-2);
      }
    }
  }
}
</style>
