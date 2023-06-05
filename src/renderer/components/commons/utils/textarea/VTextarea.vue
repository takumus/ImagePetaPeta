<template>
  <e-textarea-root :style="outerStyle">
    <e-textarea
      lock-keyboard
      ref="textArea"
      v-text="value"
      @input="input(($event.target as HTMLDivElement).innerText)"
      @blur="blur"
      @keypress.enter="enter"
      @keydown.escape="escape"
      @keydown.delete="backspace"
      @paste="paste"
      @dblclick="click('double')"
      @click="click('single')"
      :contenteditable="editing"
      :class="{
        editing: editing,
        outline: props.noOutline === false,
      }"
      spellcheck="false"
      :style="textAreaStyle">
    </e-textarea>
    <VComplement
      v-if="complements"
      :value="rawValue"
      :items="complements"
      @select="inputFromComplement"
      :z-index="10"
      :editing="editing"
      :text-area="textArea" />
  </e-textarea-root>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";

import VComplement from "@/renderer/components/commons/utils/complement/VComplement.vue";

const props = defineProps<{
  value?: string;
  look?: string;
  type: "single" | "multi";
  trim?: boolean;
  textAreaStyle?: Partial<CSSStyleDeclaration>;
  outerStyle?: Partial<CSSStyleDeclaration>;
  allowEmpty?: boolean;
  clickToEdit?: boolean;
  readonly?: boolean;
  complements?: string[];
  blurToReset?: boolean;
  noOutline?: boolean;
}>();
const emit = defineEmits<{
  (e: "update:value", value: string): void;
  (e: "deleteOfEmpty"): void;
}>();
const textArea = ref<HTMLElement>();
const rawValue = ref("");
const editing = ref(false);
onMounted(() => {
  forceResetValue();
  if (props.type === "multi" && props.blurToReset) {
    throw new Error("type = multiとblurToResetは非推奨の組み合わせです。");
  }
});
function input(value: string) {
  if (props.readonly) {
    return;
  }
  rawValue.value = format(value);
}
function inputFromComplement(value: string) {
  input(value);
  end(false);
}
function backspace() {
  if (rawValue.value === "") {
    emit("deleteOfEmpty");
  }
}
function click(type: "single" | "double") {
  if (props.readonly) {
    return;
  }
  if (editing.value) {
    return;
  }
  if (props.clickToEdit === true && type === "single") {
    edit();
  } else if (type === "double") {
    edit();
  }
}
function paste(e: ClipboardEvent) {
  if (props.readonly) {
    return;
  }
  e.preventDefault();
  const value = e.clipboardData?.getData("text/plain");
  if (value !== undefined) {
    document.execCommand("insertText", false, format(value));
  }
}
function end(blur: boolean) {
  if (props.readonly) {
    return;
  }
  if (!editing.value) {
    return;
  }
  if (props.blurToReset && blur) {
    restore();
  } else {
    value.value = rawValue.value;
  }
  editing.value = false;
  textArea.value?.blur();
}
function escape() {
  end(true);
}
function edit() {
  editing.value = true;
  forceResetValue();
  textArea.value?.focus();
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
function enter(e: KeyboardEvent) {
  if (props.readonly) {
    return;
  }
  if (props.type === "single") {
    e.preventDefault();
    end(false);
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
  rawValue.value = props.value !== undefined ? props.value : "";
  textArea.value?.scrollTo(0, 0);
}
function blur() {
  end(true);
}
function restore() {
  if (textArea.value) {
    textArea.value.innerText = value.value;
  }
}
function isEditing() {
  return editing.value;
}
const value = computed({
  get() {
    if (editing.value) {
      return format(props.value || "");
    }
    return format(
      props.look !== undefined ? props.look : props.value !== undefined ? props.value : "",
    );
  },
  set(value: string) {
    value = format(value);
    // propsが存在し、値が同じならスキップ
    if (props.value !== undefined && value === format(props.value)) {
      restore();
      return;
    }
    // 値が空で、空を許可されていない場合はスキップ
    if (value === "" && props.allowEmpty !== true) {
      restore();
      return;
    }
    emit("update:value", value);
  },
});
watch(
  () => props.value,
  () => {
    forceResetValue();
  },
);
defineExpose({
  edit,
  isEditing,
});
</script>

<style lang="scss" scoped>
e-textarea-root {
  display: inline-block;
  min-width: var(--px-3);
  position: relative;
  > e-textarea {
    line-height: var(--size-2);
    min-height: var(--size-2);
    cursor: pointer;
    display: inline-block;
    white-space: pre-wrap;
    word-break: break-word;
    outline: none;
    border-radius: 2px;
    &.editing {
      cursor: unset;
      &.outline {
        outline: solid var(--px-border) var(--color-font);
        outline-offset: var(--px-1);
      }
    }
  }
}
</style>
