<template>
  <t-textarea-root
    lock-keyboard
    ref="textArea"
    v-text="value"
    @input="input(($event.target as HTMLDivElement).innerHTML)"
    @blur="blur"
    @keypress.enter="enter"
    @paste="paste"
    @dblclick="click('double')"
    @click="click('single')"
    :contenteditable="editing || props.clickToEdit === true"
    :class="{
      editing: editing,
    }"
    spellcheck="false"
    :style="style"
  ></t-textarea-root>
</template>

<script setup lang="ts">
// Vue
import { ref, watch, onMounted, computed, nextTick } from "vue";
const props = defineProps<{
  value: string;
  look?: string;
  type: "single" | "multi";
  trim?: boolean;
  style?: CSSStyleDeclaration;
  clickToEdit?: boolean;
}>();
const emit = defineEmits<{
  (e: "update:value", value: string): void;
}>();
const textArea = ref<HTMLElement>();
const rawValue = ref("");
const editing = ref(false);
onMounted(() => {
  forceResetValue();
});
function input(value: string) {
  rawValue.value = format(value);
}
function click(type: "single" | "double") {
  if (editing.value) {
    return;
  }
  if (props.clickToEdit === true && type === "single") {
    editing.value = true;
  } else if (type === "double") {
    editing.value = true;
    nextTick(() => {
      if (textArea.value) {
        textArea.value.focus();
        const range = document.createRange();
        range.selectNodeContents(textArea.value);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    });
  }
}
function paste(e: ClipboardEvent) {
  e.preventDefault();
  const value = e.clipboardData?.getData("text/plain");
  if (value !== undefined) {
    document.execCommand("insertText", false, format(value));
  }
}
function blur() {
  if (!editing.value) {
    return;
  }
  editing.value = false;
  value.value = rawValue.value;
  textArea.value?.blur();
}
function enter(e: KeyboardEvent) {
  if (props.type === "single") {
    e.preventDefault();
    textArea.value?.blur();
  }
}
function format(value: string) {
  if (props.type === "single") {
    value = value.replace(/\r?\n/g, "");
  }
  if (props.trim === true) {
    value = value.trim();
  }
  return value;
}
function forceResetValue() {
  rawValue.value = props.value;
}
const value = computed({
  get() {
    if (editing.value) {
      return format(props.value);
    }
    return format(props.look !== undefined ? props.look : props.value);
  },
  set(value: string) {
    emit("update:value", value);
  },
});
watch(
  () => props.value,
  () => {
    forceResetValue();
  },
);
</script>

<style lang="scss" scoped>
t-textarea-root {
  cursor: pointer;
  min-width: 16px;
  display: inline-block;
  white-space: pre-wrap;
  word-break: break-word;
  overflow: hidden;
  &.editing {
    cursor: unset;
  }
}
</style>
