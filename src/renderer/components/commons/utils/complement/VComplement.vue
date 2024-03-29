<template>
  <VFloating
    :z-index="zIndex"
    :visible="props.editing && matched"
    :max-width="'256px'"
    :max-height="'unset'"
    ref="floating">
    <e-complement-root class="complement-root" ref="complement">
      <e-close v-html="textsStore.state.value.close" v-if="filteredItems.length > 0"></e-close>
      <e-tag
        v-for="(item, i) in filteredItems"
        :key="item.value"
        @pointerdown="select(item.value)"
        @pointermove="moveSelectionAbsolute(i)"
        @mouseleave="moveSelectionAbsolute(-1)"
        :class="{
          selected: i === currentIndex,
        }">
        <e-char
          v-for="co in item.value.split('').map((c, i) => ({ c, i }))"
          :key="co.i"
          :class="{
            match: item.matches.find((range) => range[0] <= co.i && co.i <= range[1]) !== undefined,
          }">
          {{ co.c }}
        </e-char>
      </e-tag>
    </e-complement-root>
  </VFloating>
</template>

<script setup lang="ts">
import Fuse from "fuse.js";
import { computed, onMounted, ref, watch } from "vue";

import VFloating from "@/renderer/components/commons/utils/floating/VFloating.vue";

import { Keyboards, Keys } from "@/renderer/libs/keyboards";
import { useKeyboardsStore } from "@/renderer/stores/keyboardsStore/useKeyboardsStore";
import { useTextsStore } from "@/renderer/stores/textsStore/useTextsStore";

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
const currentIndex = ref(0);
const keyboards = useKeyboardsStore();
const textsStore = useTextsStore();
const floating = ref<InstanceType<typeof VFloating>>();
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
    floating.value?.updateFloating(props.textArea.getBoundingClientRect());
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
const matched = computed(() => filteredItems.value.length > 0);
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
e-complement-root {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: center;
  padding: var(--px-2) var(--px-2) var(--px-2) var(--px-1);
  overflow-y: auto;
  text-align: left;
  word-break: break-word;
  > e-tag {
    display: inline-block;
    cursor: pointer;
    margin: 0px 0px var(--px-1) var(--px-1);
    box-shadow: var(--shadow-small);
    border-radius: var(--rounded);
    background-color: var(--color-1);
    padding: var(--px-1);
    line-height: var(--size-2);
    &.selected,
    &.close:hover {
      background-color: var(--color-accent-1);
    }
    > e-char {
      display: inline;
      &.match {
        font-weight: bold;
        text-decoration: underline;
      }
    }
  }
  > e-close {
    display: inline-block;
    cursor: pointer;
    margin-bottom: var(--px-2);
    width: 100%;
    text-align: center;
  }
}
</style>
