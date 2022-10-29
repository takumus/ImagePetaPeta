<template>
  <t-complement-root
    class="complement-root"
    ref="complement"
    v-show="props.editing"
    :style="{
      transform: `translate(${position.x}px, ${position.y}px)`,
      height: height,
      zIndex: zIndex,
    }"
  >
    <t-tag
      v-for="(item, i) in filteredItems"
      :key="item"
      @pointerdown="select(item)"
      @pointermove="moveSelectionAbsolute(i)"
      @mouseleave="moveSelectionAbsolute(-1)"
      :class="{
        selected: i === currentIndex,
      }"
    >
      {{ item }}
    </t-tag>
    <t-close v-html="textsStore.state.value.close" v-if="filteredItems.length > 0"></t-close>
  </t-complement-root>
</template>

<script setup lang="ts">
// Vue
import { ref, onMounted, watch } from "vue";

// Others
import { Vec2 } from "@/commons/utils/vec2";
import { Keyboards, Keys } from "@/rendererProcess/utils/keyboards";
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
const searcher: FuzzySearch<string> = new FuzzySearch([], undefined, {
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
function disableUpDownKeys() {
  props.textArea?.addEventListener("keydown", (e) => {
    const code = e.code as Keys;
    if (code === "ArrowDown" || code === "ArrowUp" || code === "Tab") {
      e.preventDefault();
    }
  });
}
watch(
  () => props.editing,
  () => {
    if (props.editing) {
      input();
    }
  },
);
watch(filteredItems, () => {
  keyboards.enabled = filteredItems.value.length > 0;
});
watch(() => props.textArea, disableUpDownKeys);
watch(() => props.items, input);
watch(() => props.value, input);
</script>

<style lang="scss" scoped>
t-complement-root {
  position: fixed;
  background-color: var(--color-main);
  margin: 0px;
  box-shadow: 1px 1px 5px rgba(0, 0, 0, 0.5);
  color: var(--color-font);
  border-radius: var(--rounded);
  overflow-y: auto;
  overflow-x: hidden;
  top: 0px;
  left: 0px;

  outline: none;
  padding: 8px 8px 8px 4px;
  word-break: break-word;
  text-align: left;
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: center;
  overflow-y: auto;
  max-width: 256px;
  > t-tag {
    line-height: var(--size-2);
    display: inline-block;
    margin: 0px 0px 4px 4px;
    border-radius: var(--rounded);
    padding: 4px;
    background-color: var(--color-sub);
    cursor: pointer;
    &.selected,
    &.close:hover {
      background-color: var(--color-hover);
    }
  }
  > t-close {
    cursor: pointer;
    display: inline-block;
    width: 100%;
    text-align: center;
  }
}
</style>
