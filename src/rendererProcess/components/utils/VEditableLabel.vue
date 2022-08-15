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
        ref="label"
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

<script lang="ts">
// Vue
import { Keyboards } from "@/rendererProcess/utils/keyboards";
import { Options, Vue } from "vue-class-component";
import { Prop, Ref, Watch } from "vue-property-decorator";
@Options({
  components: {
  },
  emits: [
    "change",
    "focus",
    "input",
    "delete"
  ]
})
export default class VEditableLabel extends Vue {
  @Prop()
  label!: string;
  @Prop()
  labelLook!: string;
  @Prop()
  growWidth!: boolean;
  @Prop()
  readonly!: boolean;
  @Prop()
  clickToEdit!: boolean;
  @Prop()
  noOutline!: boolean;
  @Prop()
  allowEmpty!: boolean;
  @Ref("label")
  labelInput!: HTMLElement;
  tempText = "Hello";
  editing = false;
  labelWidth = 0;
  labelHeight = 0;
  keyboard = new Keyboards(false);
  mounted() {
    this.changeLabel();
    this.keyboard.down(["Backspace", "Delete"], () => {
      if (this.tempText === "") {
        this.$emit("delete", this);
      }
    });
  }
  unmounted() {
    //
  }
  async edit(dblclick = false) {
    if (this.readonly || this.editing) {
      return;
    }
    if (!this.clickToEdit && !dblclick) {
      // ワンクリック編集が有効じゃなかったら、ワンクリックで反応しない。
      return;
    }
    this.keyboard.enabled = true;
    this.editing = true;
    this.tempText = this.label;
    this.$nextTick(() => {
      this.labelInput.focus();
      const range = document.createRange();
      range.selectNodeContents(this.labelInput);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    });
  }
  keyPressEnter(e: KeyboardEvent) {
    e.preventDefault();
    setTimeout(() => {
      this.apply();
    }, 1);
  }
  preventLineBreak(e: KeyboardEvent) {
    e.preventDefault();
  }
  apply(text?: string) {
    if (!this.editing) {
      return;
    }
    this.editing = false;
    this.keyboard.enabled = false;
    if (this.readonly) {
      return;
    }
    setTimeout(() => {
      if (text !== undefined) {
        this.tempText = text;
      }
      this.tempText = this.tempText.trim();
      if (!this.allowEmpty) {
        if (this.label === this.tempText || this.tempText === "") {
          this.tempText = this.label;
          return;
        }
      }
      this.$emit("change", this.tempText);
    }, 1);
  }
  cancel() {
    if (!this.editing) {
      return;
    }
    setTimeout(() => {
      this.tempText = this.label;
    }, 1);
    this.editing = false;
    this.keyboard.enabled = false;
  }
  input(event: InputEvent) {
    this.tempText = (event.target as HTMLElement).innerText;
    this.$emit("input", this.tempText);
  }
  focus(event: FocusEvent) {
    this.$emit("focus", this);
  }
  @Watch("label")
  changeLabel() {
    this.tempText = this.label.trim().replace(/\r?\n/g, "");
  }
}
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
      line-height: 1.2em;
      font-size: 1.0em;
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