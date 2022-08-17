<template>
  <t-editable-label-root
    :style="{
      width: growWidth ? '100%' : 'unset'
    }"
    :class="{ editing: editing }"
  >
    <t-outline
      :class="{
        'no-outline': noOutline
      }"
      :style="{
        width: growWidth ? '100%' : 'unset'
      }"
    >
      <t-editable-label
        v-text="labelLook && !editing ? labelLook : tempText"
        ref="labelInput"
        placeholder=""
        :contenteditable="editing"
        @blur="cancel"
        @focus="focus($event)"
        @dblclick="edit(true)"
        @click="edit()"
        @input="input"
        @keypress.enter="keyPressEnter"
        @keydown.tab="preventLineBreak"
        lock-keyboard
      >
      </t-editable-label>
    </t-outline>
  </t-editable-label-root>
</template>

<script setup lang="ts">
// Vue
import { Keyboards } from "@/rendererProcess/utils/keyboards";
import { ref, watch, getCurrentInstance, onMounted, nextTick } from "vue";
const _this = getCurrentInstance()!.proxy!;
const emit = defineEmits<{
  (e: "change", value: string): void
  (e: "focus", editableLabel: typeof _this): void,
  (e: "input", value: string): void,
  (e: "delete", editableLabel: typeof _this): void
}>();
const props = defineProps<{
  label: string,
  labelLook?: string,
  growWidth?: boolean,
  readonly?: boolean,
  clickToEdit?: boolean,
  noOutline?: boolean,
  allowEmpty?: boolean
}>();
const labelInput = ref<HTMLElement>();
const tempText = ref("Hello");
const editing = ref(false);
const keyboard = new Keyboards(false);
onMounted(() => {
  changeLabel();
  keyboard.down(["Backspace", "Delete"], () => {
    if (tempText.value === "") {
      emit("delete", _this);
    }
  });
});
function edit(dblclick = false) {
  if (props.readonly || editing.value) {
    return;
  }
  if (!props.clickToEdit && !dblclick) {
    // ワンクリック編集が有効じゃなかったら、ワンクリックで反応しない。
    return;
  }
  keyboard.enabled = true;
  editing.value = true;
  tempText.value = props.label;
  nextTick(() => {
    if (labelInput.value === undefined) {
      return;
    }
    labelInput.value.focus();
    const range = document.createRange();
    range.selectNodeContents(labelInput.value);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  });
}
function keyPressEnter(e: KeyboardEvent) {
  e.preventDefault();
  setTimeout(() => {
    apply();
  }, 1);
}
function preventLineBreak(e: KeyboardEvent) {
  e.preventDefault();
}
function apply(text?: string) {
  if (!editing.value) {
    return;
  }
  editing.value = false;
  keyboard.enabled = false;
  if (props.readonly) {
    return;
  }
  setTimeout(() => {
    if (text !== undefined) {
      tempText.value = text;
    }
    tempText.value = tempText.value.trim();
    if (!props.allowEmpty) {
      if (props.label === tempText.value || tempText.value === "") {
        tempText.value = props.label;
        return;
      }
    }
    emit("change", tempText.value);
  }, 1);
}
function cancel() {
  if (!editing.value) {
    return;
  }
  setTimeout(() => {
    tempText.value = props.label;
  }, 1);
  editing.value = false;
  keyboard.enabled = false;
}
function input(event: InputEvent) {
  tempText.value = (event.target as HTMLElement).innerText;
  emit("input", tempText.value);
}
function focus(event: FocusEvent) {
  emit("focus", _this);
}
function changeLabel() {
  tempText.value = props.label.trim().replace(/\r?\n/g, "");
}
watch(() => props.label, changeLabel);
defineExpose({
  edit
});
</script>

<style lang="scss" scoped>
t-editable-label-root {
  padding: 0px;
  margin: 0px;
  display: inline-block;
  text-align: left;
  >t-outline {
    display: inline-block;
    // background-color: #ff0000;
    text-align: left;
    >t-editable-label {
      line-height: var(--size-2);
      text-align: left;
      padding: 0px;
      margin: 0px;
      border: none;
      background: none;
      cursor: pointer;
      height: 16px;
      width: 100%;
      word-break: break-word;
      display: inline-block;
      text-decoration: inherit;
      outline: none;
      &::before {
        content: "";
        display: inline-block;
      }
    }
  }
  &.editing {
    >t-outline {
      border-radius: 4px;
      padding: 0px 4px;
      border: solid 1.2px var(--color-border);
      &.no-outline {
        border: none;
      }
      >t-editable-label {
        &:empty::after {
          content: "";
        }
        cursor: text;
      }
    }
  }
}
</style>