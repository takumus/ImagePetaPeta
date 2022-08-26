<template>
  <t-textarea-root :style="outerStyle">
    <t-textarea
      lock-keyboard
      ref="textArea"
      v-text="value"
      @input="input(($event.target as HTMLDivElement).innerHTML)"
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
      }"
      spellcheck="false"
      :style="textAreaStyle"
    >
    </t-textarea>
    <VComplement
      v-if="complements"
      :value="rawValue"
      :items="complements"
      @select="inputFromComplement"
      :zIndex="10"
      :editing="editing"
      :textArea="textArea"
    />
  </t-textarea-root>
</template>

<script setup lang="ts">
// Vue
import { ref, watch, onMounted, computed, nextTick } from "vue";
import VComplement from "@/rendererProcess/components/utils/VComplement.vue";
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
  console.log("input:", value);
  if (props.readonly) {
    return;
  }
  rawValue.value = format(value);
}
function inputFromComplement(value: string) {
  console.log("complement:", value);
  input(value);
  end(false);
}
function backspace() {
  if (rawValue.value === "") {
    console.log("delete of empty");
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
    console.log("end: reset:", value.value);
    restore();
  } else {
    console.log("end: apply:", rawValue.value);
    value.value = rawValue.value;
  }
  editing.value = false;
  textArea.value?.blur();
}
function escape() {
  end(true);
}
function edit() {
  console.log("edit:", value.value);
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
}
function blur() {
  end(true);
}
function restore() {
  if (textArea.value) {
    textArea.value.innerHTML = value.value;
  }
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
    console.log("emit:", value);
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
});
</script>

<style lang="scss" scoped>
t-textarea-root {
  display: inline-block;
  min-width: 16px;
  > t-textarea {
    line-height: var(--size-2);
    min-height: var(--size-2);
    cursor: pointer;
    display: inline-block;
    white-space: pre-wrap;
    word-break: break-word;
    overflow: hidden;
    &.editing {
      cursor: unset;
      padding: 0px 3px;
    }
  }
}
</style>
