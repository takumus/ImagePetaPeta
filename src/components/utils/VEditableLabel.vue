<template>
  <span class="editable-label-root" :style="{ width: growWidth ? '100%' : 'unset' }">
    <span
      class="editable-label"
      v-text="labelLook && !editing ? labelLook : tempText"
      ref="label"
      :style="{ width: _labelWidth, height: _labelHeight }"
      :contenteditable="editing"
      @blur="apply"
      @keydown.enter="apply"
      @focus="focus($event)"
      @dblclick="edit()"
      @input="input"
    >
    </span>
  </span>
</template>

<style lang="scss" scoped>
.editable-label {
  line-height: 1.0em;
  font-size: 1.0em;
  text-align: left;
  color: #333333;
  // padding: 12px;
  // flex-shrink: 1;
  padding: 0px;
  margin: 0px;
  overflow: visible;
  white-space: nowrap;
  border: none;
  background: none;
  // outline: none;
  cursor: pointer;
  min-width: 32px;
  height: 16px;
  width: 100%;
  &.editing {
    cursor: inherit;
  }
}
.editable-label::after {
  content: "";
  display: inline-block;
  width: 16px;
}
.editable-label-root {
  padding: 0px;
  margin: 0px;
  display: inline-block;
}
</style>

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
  async edit() {
    if (this.readonly) return;
    this.editing = true;
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
    setTimeout(() => {
      if (this.readonly) return;
      if (!this.editing) return;
      this.editing = false;
      if (this.label == this.tempText) return;
      this.$emit("change", this.tempText);
      // もとに戻す
      this.tempText = this.label;
    }, 1);
  }
  focus(event: FocusEvent) {
    this.$emit("focus", event);
  }
  input(event: InputEvent) {
    this.tempText = (event.target as HTMLElement).innerText;
  }
  @Watch("label")
  changeLabel() {
    this.tempText = this.label;
  }
  get _labelWidth() {
    return this.labelWidth + "px";
  }
  get _labelHeight() {
    return this.labelHeight + "px";
  }
}
</script>
