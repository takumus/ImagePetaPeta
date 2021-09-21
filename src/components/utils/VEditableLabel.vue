<template>
  <span class="editable-label-root" :style="{ width: growWidth ? '100%' : 'unset' }">
    <input
      :style="{ width: _labelWidth, height: _labelHeight }"
      v-show="editing"
      class="editable-label input"
      type="text"
      v-model="tempText"
      @blur="apply"
      @keyup.enter="apply"
      ref="labelInput"
    >
    <span
      :style="{ visibility: editing ? 'hidden' : 'visible', width: growWidth ? '100%' : 'unset' }"
      class="editable-label"
      ref="labelSpan"
      @dblclick="edit()"
    >
      {{labelLook && !editing ? labelLook : tempText}}
    </span>
  </span>
</template>

<style lang="scss" scoped>
.editable-label {
  display: block;
  line-height: 1.0em;
  font-size: 1.0em;
  text-align: left;
  color: #333333;
  // padding: 12px;
  // flex-shrink: 1;
  padding: 0px;
  margin: 0px;
  overflow: visible;
  text-overflow: ellipsis;
  white-space: nowrap;
  border: none;
  background: none;
  // outline: none;
  cursor: pointer;
  min-width: 32px;
  height: 16px;
  &.editing {
    cursor: inherit;
  }
  &.input {
    position: absolute;
    top: 0px;
    left: 0px;
  }
}
.editable-label-root {
  padding: 0px;
  margin: 0px;
  display: inline-block;
  position: relative;
}
</style>

<script lang="ts">
import { API, log } from "@/api";
import { Options, Vue } from "vue-class-component";
import { Prop, Ref, Watch } from "vue-property-decorator";
@Options({
  components: {
  },
  emits: [
    "change"
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
  @Ref("labelSpan")
  labelSpan!: HTMLElement;
  @Ref("labelInput")
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
    this.changeTempText();
    this.$nextTick(() => {
      this.labelInput.focus();
      this.labelInput.select();
    });
  }
  apply() {
    if (this.readonly) return;
    if (!this.editing) return;
    this.editing = false;
    if (this.label == this.tempText) return;
    this.$emit("change", this.tempText);
    // もとに戻す
    this.tempText = this.label;
  }
  @Watch("tempText")
  changeTempText() {
    if (this.readonly) return;
    this.$nextTick(() => {
      const rect = this.labelSpan.getBoundingClientRect();
      this.labelWidth = rect.width;
      this.labelHeight = rect.height;
    })
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
