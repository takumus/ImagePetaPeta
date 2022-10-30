<template>
  <t-complement-root
    class="complement-root"
    ref="complement"
    v-show="props.editing && matched"
    :style="{
      transform: `translate(${position.x}px, ${position.y}px)`,
      maxHeight: height,
      zIndex: zIndex,
    }"
  >
    <t-close v-html="textsStore.state.value.close" v-if="filteredItems.length > 0"></t-close>
    <t-tag
      v-for="(item, i) in filteredItems"
      :key="item.value"
      @pointerdown="select(item.value)"
      @pointermove="moveSelectionAbsolute(i)"
      @mouseleave="moveSelectionAbsolute(-1)"
      :class="{
        selected: i === currentIndex,
      }"
    >
      <t-char
        v-for="co in item.value.split('').map((c, i) => ({ c, i }))"
        :key="co.i"
        :class="{
          match: item.matches.find((range) => range[0] <= co.i && co.i <= range[1]) !== undefined,
        }"
      >
        {{ co.c }}
      </t-char>
    </t-tag>
  </t-complement-root>
</template>

<script setup lang="ts">
// Vue
import { ref, onMounted, watch, computed } from "vue";

// Others
import { Vec2 } from "@/commons/utils/vec2";
import { Keyboards, Keys } from "@/rendererProcess/utils/keyboards";
import Fuse from "fuse.js";
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
const filteredItems = ref<{ value: string; matches: [number, number][] }[]>([]);
const position = ref(new Vec2(0, 0));
const currentIndex = ref(0);
const height = ref("unset");
const keyboards = useKeyboardsStore();
const textsStore = useTextsStore();
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
      select(item.value);
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
  const fuse = new Fuse(props.items, {
    includeMatches: true,
    includeScore: true,
  });

  const result = fuse.search(value);
  if (value === "") {
    filteredItems.value = props.items.map((item) => ({ value: item, matches: [] }));
  } else {
    filteredItems.value = result.map((r) => {
      const matches: [number, number][] =
        r.matches?.[0]?.indices.map((match) => [match[0], match[1]]) ?? [];
      return {
        value: r.item,
        matches,
      };
    });
  }
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
const matched = computed(() => {
  return filteredItems.value.length > 0;
});
watch(
  () => props.editing,
  () => {
    if (props.editing) {
      input();
    }
  },
);
watch(matched, () => {
  keyboards.enabled = matched.value;
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
  padding: var(--px1) var(--px1) var(--px1) var(--px0);
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
    margin: 0px 0px var(--px0) var(--px0);
    border-radius: var(--rounded);
    padding: var(--px0);
    background-color: var(--color-sub);
    cursor: pointer;
    &.selected,
    &.close:hover {
      background-color: var(--color-hover);
    }
    > t-char {
      display: inline;
      &.match {
        font-weight: bold;
        text-decoration: underline;
      }
    }
  }
  > t-close {
    cursor: pointer;
    display: inline-block;
    width: 100%;
    margin-bottom: var(--px1);
    text-align: center;
  }
}
</style>
