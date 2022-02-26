<template>
  <article
    class="editable-label-root"
    :style="{
      width: growWidth ? 'unset' : 'unset'
    }"
    :class="{ editing: editing }"
  >
    <span
      class="editable-label"
      v-text="labelLook && !editing ? labelLook : tempText"
      ref="label"
      placeholder=""
      :contenteditable="editing"
      @blur="apply"
      @keydown.enter="apply"
      @focus="focus($event)"
      @dblclick="edit(true)"
      @click="edit()"
      @input="input"
    >
    </span>
  </article>
</template>

<script lang="ts">
// Vue
import { Options, Vue } from "vue-class-component";
import { Prop, Ref, Watch } from "vue-property-decorator";
@Options({
  components: {
  },
  emits: [
    "change",
    "focus"
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
  @Ref("label")
  labelInput!: HTMLInputElement;
  tempText = "Hello";
  editing = false;
  labelWidth = 0;
  labelHeight = 0;
  mounted() {
    this.changeLabel();
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
  apply() {
    // blur又はenterと当時にapplyすると、色々厄介だから少し待つ
    if (!this.editing) {
      return;
    }
    this.editing = false;
    this.tempText = this.tempText.trim();
    setTimeout(() => {
      if (this.readonly) {
        return;
      }
      if (this.label == this.tempText || this.tempText == "") {
        this.tempText = this.label;
        return;
      }
      this.$emit("change", this.tempText);
    }, 10);
  }
  focus(event: FocusEvent) {
    this.$emit("focus", event);
  }
  input(event: InputEvent) {
    this.tempText = (event.target as HTMLElement).innerText;
  }
  @Watch("label")
  changeLabel() {
    this.tempText = this.label.trim();
  }
}
</script>

<style lang="scss" scoped>
.editable-label-root {
  padding: 0px;
  margin: 0px;
  display: inline-block;
  >.editable-label {
    line-height: 1.0em;
    font-size: 1.0em;
    text-align: left;
    padding: 0px;
    margin: 0px;
    // overflow: visible;
    white-space: nowrap;
    border: none;
    background: none;
    cursor: pointer;
    height: 16px;
    width: 100%;
    word-break: break-all;
    white-space: pre-wrap;
    display: inline-block;
    text-decoration: inherit;
  }
  &.editing {
    >.editable-label {
      &::after {
        content: "   ";
        display: inline-block;
      }
    }
  }
}
</style>