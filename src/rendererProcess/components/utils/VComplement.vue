<template>
  <ul
    v-show="props.editing"
    class="complement-root"
    ref="complement"
    :style="{
      top: position.y + 'px',
      left: position.x + 'px',
      height: height,
      zIndex: zIndex,
    }"
  >
    <li
      v-for="(item, i) in filteredItems"
      :key="item"
      @pointerdown="select(item)"
      @pointermove="moveSelectionAbsolute(i)"
      @mouseleave="moveSelectionAbsolute(-1)"
      class="item"
      :class="{
        selected: i === currentIndex,
      }"
    >
      {{ item }}
    </li>
    <li
      class="item close"
      v-html="textsStore.state.value.close"
      v-if="filteredItems.length > 0"
    ></li>
  </ul>
</template>

<script setup lang="ts">
// Vue
import { ref, onMounted, watch } from "vue";

// Others
import { Vec2 } from "@/commons/utils/vec2";
import { Keyboards } from "@/rendererProcess/utils/keyboards";
import FuzzySearch from "fuzzy-search";
import { useKeyboardsStore } from "@/rendererProcess/stores/keyboardsStore";
import { useTextsStore } from "@/rendererProcess/stores/textsStore";
const props = defineProps<{
  zIndex: number;
  value: string;
  items: string[];
  editing: boolean;
  textArea?: HTMLElement;
}>();
const emit = defineEmits<{
  (e: "select", value: string): void;
  (e: "cancel"): void;
}>();
const complement = ref<HTMLElement>();
const filteredItems = ref<string[]>([]);
const position = ref(new Vec2(0, 0));
const currentIndex = ref(0);
const height = ref("unset");
const keyboards = useKeyboardsStore();
const textsStore = useTextsStore();
let searcher: FuzzySearch<string> = new FuzzySearch([], undefined, {
  sort: true,
});
onMounted(() => {
  keyboards.keys("ArrowUp").down(() => {
    if (!props.editing) return;
    moveSelectionRelative(-1);
  });
  keyboards.keys("ArrowDown").down(() => {
    if (!props.editing) return;
    moveSelectionRelative(1);
  });
  keyboards.keys("Tab").down(() => {
    if (!props.editing) return;
    moveSelectionRelative(Keyboards.pressedOR("ShiftLeft", "ShiftRight") ? -1 : 1);
  });
  keyboards.keys("Enter").down(() => {
    if (!props.editing) return;
    const item = filteredItems.value[currentIndex.value];
    if (item) {
      select(item);
    }
  });
  setInterval(() => {
    if (props.editing) {
      updatePosition();
    }
  }, 50);
});
function normalizeIndex() {
  if (currentIndex.value < 0) {
    if (filteredItems.value.length > 0) {
      currentIndex.value = filteredItems.value.length - 1;
    } else {
      currentIndex.value = 0;
    }
  }
  if (filteredItems.value.length > 0) {
    currentIndex.value = currentIndex.value % filteredItems.value.length;
  }
}
function moveSelectionAbsolute(index: number) {
  currentIndex.value = index;
  // this.normalizeIndex();
  moveCursorToLast();
}
function moveSelectionRelative(index: number) {
  currentIndex.value += index;
  normalizeIndex();
  moveCursorToLast();
}
function moveCursorToLast() {
  //
}
function input() {
  if (!props.editing) {
    return;
  }
  currentIndex.value = -1;
  const value = props.value.trim();
  // -Fuzzy
  searcher.haystack = props.items;
  filteredItems.value = searcher.search(value);
  updatePosition();
}
function select(item: string) {
  emit("select", item);
}
function updatePosition() {
  if (props.textArea) {
    const inputRect = props.textArea.getBoundingClientRect();
    position.value.x = inputRect.x;
    position.value.y = inputRect.y + inputRect.height;
    height.value = "unset";
    if (complement.value) {
      const rect = complement.value.getBoundingClientRect();
      if (position.value.x + rect.width > document.body.clientWidth - 9) {
        position.value.x = document.body.clientWidth - rect.width - 8;
      }
      if (position.value.y + rect.height > document.body.clientHeight - 9) {
        // this.position.y = document.body.clientHeight - rect.height;
        height.value = `${document.body.clientHeight - position.value.y - 8}px`;
      }
    }
  }
}
watch(
  () => props.editing,
  () => {
    if (props.editing) {
      console.log("open");
      input();
    }
  },
);
watch(filteredItems, () => {
  keyboards.enabled = filteredItems.value.length > 0;
});
watch(
  () => props.items,
  () => {
    input();
  },
);
watch(
  () => props.value,
  () => {
    input();
  },
);
</script>

<style lang="scss" scoped>
.complement-root {
  position: fixed;
  background-color: var(--color-main);
  padding: 0px;
  margin: 0px;
  box-shadow: 1px 1px 5px rgba(0, 0, 0, 0.5);
  color: var(--color-font);
  border-radius: var(--rounded);
  overflow-y: auto;
  overflow-x: hidden;
  > .item {
    word-break: break-word;
    list-style-type: none;
    min-width: 128px;
    width: 256px;
    padding: 4px 24px;
    // padding-left: 24px;
    font-size: var(--size-1);
    cursor: pointer;
    &.selected,
    &.close:hover {
      background-color: var(--color-hover);
    }
    &.close {
      text-align: center;
    }
  }
  > .separate {
    border-bottom: solid 1px #cccccc;
    margin: 0px 8px;
    height: 0px;
    overflow: hidden;
  }
}
</style>
