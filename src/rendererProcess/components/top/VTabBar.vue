<template>
  <t-tab-root>
    <t-tab
      :class="{ selected: b === board }"
      :style="{ opacity: b === board && dragging ? 0 : 1 }"
      v-for="(b, index) in boards"
      @pointerdown="pointerdown($event, b, index)"
      @contextmenu="menu($event, b)"
      :key="b.id"
      :ref="(element) => setTabRef(element as HTMLElement, b.id)"
    >
      <t-label-wrapper>
        <t-label>
          <VTextarea :type="'single'" :trim="true" :value="b.name" @update:value="(v) => changePetaBoardName(b, v)" />
        </t-label>
      </t-label-wrapper>
    </t-tab>
    <t-tab class="add" @click="addPetaBoard()">
      <t-label-wrapper>
        <t-label>
          <VTextarea :type="'single'" :trim="true" :readonly="true" :value="textsStore.state.value.plus" />
        </t-label>
      </t-label-wrapper>
    </t-tab>
    <t-tab class="selected drag" ref="draggingTab" :style="{ display: dragging ? 'block' : 'none' }" v-show="dragging">
      <t-label-wrapper>
        <t-label>
          <VTextarea :type="'single'" :trim="true" :readonly="true" :value="board.name" v-if="board" />
        </t-label>
      </t-label-wrapper>
    </t-tab>
  </t-tab-root>
</template>

<script setup lang="ts">
// Vue
import { computed, onBeforeUpdate, onMounted, onUnmounted, ref } from "vue";
// Others
import { vec2FromPointerEvent } from "@/commons/utils/vec2";
import { PetaBoard } from "@/commons/datas/petaBoard";
import { MouseButton } from "@/commons/datas/mouseButton";
import { isKeyboardLocked } from "@/rendererProcess/utils/isKeyboardLocked";
import { useTextsStore } from "@/rendererProcess/stores/textsStore";
import { useI18n } from "vue-i18n";
import { useComponentsStore } from "@/rendererProcess/stores/componentsStore";
import VTextarea from "@/rendererProcess/components/utils/VTextarea.vue";

const emit = defineEmits<{
  (e: "add"): void;
  (e: "remove", board: PetaBoard): void;
  (e: "select", board: PetaBoard): void;
  (e: "update:board", board: PetaBoard): void;
}>();
const props = defineProps<{
  boards: PetaBoard[];
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
function pointerdown(event: PointerEvent, board: PetaBoard, index: number) {
  if (isKeyboardLocked()) return;
  if (event.button != MouseButton.LEFT) return;
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
function menu(event: PointerEvent, board: PetaBoard) {
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
function selectPetaBoard(board: PetaBoard) {
  emit("select", board);
}
function changePetaBoardName(board: PetaBoard, name: string) {
  if (name === "") {
    return;
  }
  emit("update:board", {
    ...board,
    name,
  });
}
async function removePetaBoard(board: PetaBoard) {
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
t-tab-root {
  --tab-height: 24px;
  --top-draggable-height: 10px;
  top: 0px;
  left: 0px;
  background-color: var(--color-sub);
  color: var(--color-font);
  height: var(--tab-height);
  display: flex;
  > t-tab {
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
      > t-label-wrapper t-label {
        padding: 0px 8px;
      }
    }
    &:not(.selected):not(:hover) + t-tab:not(.selected):not(:hover) {
      &::after {
        content: "";
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
      &::before,
      &::after {
        content: "";
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
      &::before,
      &::after {
        content: "";
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
    > t-label-wrapper {
      display: flex;
      align-items: center;
      height: 100%;
      > t-label {
        padding: 0px 8px;
        flex-shrink: 1;
      }
    }
  }
}
</style>
