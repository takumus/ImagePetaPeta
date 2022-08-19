<template>
  <ul
    v-show="show"
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
    <li class="item close" v-html="$texts.close" v-if="filteredItems.length > 0"></li>
  </ul>
</template>

<script setup lang="ts">
// Vue
import { ref, watch, getCurrentInstance, onMounted, nextTick } from "vue";
import { computed } from "@vue/reactivity";

// Others
import { Vec2 } from "@/commons/utils/vec2";
import { Keyboards } from "@/rendererProcess/utils/keyboards";
import FuzzySearch from "fuzzy-search";
import { useKeyboardsStore } from "@/rendererProcess/stores/keyboardsStore";
defineProps<{
  zIndex: number;
}>();

const _this = getCurrentInstance()!.proxy!;
const complement = ref<HTMLElement>();
const items = ref<string[]>([]);
const filteredItems = ref<string[]>([]);
const position = ref(new Vec2(0, 0));
const show = ref(false);
const target = ref<any>();
const currentIndex = ref(0);
const height = ref("unset");
const keyboards = useKeyboardsStore();
let searcher: FuzzySearch<string>;
onMounted(() => {
  keyboards.keys("ArrowUp").down(() => {
    if (!target.value) return;
    moveSelectionRelative(-1);
  });
  keyboards.keys("ArrowDown").down(() => {
    if (!target.value) return;
    moveSelectionRelative(1);
  });
  keyboards.keys("Tab").down(() => {
    if (!target.value) return;
    moveSelectionRelative(Keyboards.pressedOR("ShiftLeft", "ShiftRight") ? -1 : 1);
  });
  keyboards.keys("Enter").down(() => {
    if (!target.value) return;
    const item = filteredItems.value[currentIndex.value];
    if (item) {
      select(item);
    }
  });
  keyboards.keys("Escape").down(() => {
    nextTick(() => {
      blur();
    });
  });
  setInterval(() => {
    if (show.value) {
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
  setTimeout(() => {
    const range = document.createRange();
    if (target.value?.labelInput.firstChild) {
      range.setStart(target.value.labelInput.firstChild, target.value.tempText.length);
      range.collapse(true);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, 1);
}
function open(_input: any, items: string[]): void {
  if (_input === target.value && show.value) {
    return;
  }
  updateItems(items);
  target.value = _input;
  filteredItems.value = [];
  target.value.labelInput.addEventListener("blur", blur);
  target.value.labelInput.addEventListener("input", input);
  show.value = true;
  input();
  keyboards.enabled = true;
  keyboards.lock();
  updatePosition();
}
function updateItems(_items: string[]) {
  items.value = _items;
  searcher = new FuzzySearch(_items, undefined, {
    sort: true,
  });
  input();
}
function blur() {
  show.value = false;
  keyboards.enabled = false;
  keyboards.unlock();
  if (target.value) {
    target.value.labelInput.removeEventListener("blur", blur);
    target.value.labelInput.removeEventListener("input", input);
    target.value.labelInput.blur();
    target.value = undefined;
  }
}
function input() {
  if (!show.value || !target.value) {
    return;
  }
  currentIndex.value = -1;
  const value = target.value.tempText.trim();
  // -Fuzzy
  if (searcher) {
    filteredItems.value = searcher?.search(value);
  }
  updatePosition();
}
function select(item: string) {
  if (target.value) {
    target.value.apply(item);
    blur();
  }
}
function updatePosition() {
  if (target.value && target.value.$el) {
    const inputRect = (target.value.$el as HTMLElement).getBoundingClientRect();
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
_this.$components.complement = {
  open,
  updateItems,
};
defineExpose({
  updateItems,
  open,
});
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
