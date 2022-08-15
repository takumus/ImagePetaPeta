<template>
  <t-modal-root
    :class="{
      'no-background': noBackground
    }"
    v-show="visible"
    :style=" {
      ...(parentStyle ? parentStyle : {}),
      zIndex: zIndex
    }"
    ref="background"
  >
    <t-modal
      :style="childStyle ? {
        ...childStyle,
        ...(center ? centerStyle : {})
      } : (center ? centerStyle : {})"
    >
      <t-buttons v-if="visibleCloseButton">
        <t-button @click="close" v-html="$texts.close"></t-button>
      </t-buttons>
      <t-content>
        <slot></slot>
      </t-content>
    </t-modal>
  </t-modal-root>
</template>

<script lang="ts">
// Vue
import { Options, Vue } from "vue-class-component";
import { Prop, Ref, Watch } from "vue-property-decorator";
// Others
import { v4 as uuid } from "uuid";
import { Keyboards } from "@/rendererProcess/utils/keyboards";
@Options({
  components: {
  },
  emits: [
    "state",
    "close"
  ]
})
export default class VModal extends Vue {
  @Prop()
  visible = false;
  @Prop()
  parentStyle = {};
  @Prop()
  childStyle = {};
  @Prop()
  center = false;
  @Prop()
  visibleCloseButton = true;
  @Prop()
  ignore = false;
  @Prop()
  defaultZIndex = 0;
  zIndex = 0;
  noBackground = false;
  @Ref("background")
  background!: HTMLElement;
  centerStyle = {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)"
  }
  modalId = uuid();
  clickBackground = false;
  keyboards = new Keyboards();
  async mounted() {
    this.background.addEventListener("pointerdown", this.pointerdown);
    this.background.addEventListener("pointerup", this.pointerup);
    this.keyboards.enabled = true;
    this.keyboards.down(["Escape"], this.pressEscape);
    this.zIndex = this.defaultZIndex;
  }
  unmounted() {
    this.background.removeEventListener("pointerdown", this.pointerdown);
    this.background.removeEventListener("pointerup", this.pointerup);
    this.keyboards.destroy();
  }
  close() {
    this.$emit("close");
  }
  pointerdown(event: PointerEvent) {
    this.clickBackground = event.target === this.background;
  }
  pointerup(event: PointerEvent) {
    if (event.target === this.background && this.clickBackground) {
      this.close();
      this.clickBackground = false;
    }
  }
  get isActive() {
    return this.modalId === this.$components.modal.modalIds[this.$components.modal.modalIds.length - 1];
  }
  @Watch("$components.modal.modalIds")
  changeModal() {
    this.noBackground = !this.isActive;
  }
  @Watch("visible")
  changeVisible() {
    if (this.ignore) {
      return;
    }
    // 自分のidを除外
    this.$components.modal.modalIds = this.$components.modal.modalIds.filter((id) => id != this.modalId);
    if (this.visible) {
      // 自分のidを追加
      this.$components.modal.modalIds.push(this.modalId);
      this.zIndex = this.$components.modal.currentModalZIndex + 3;
      this.$components.modal.currentModalZIndex ++;
    }
  }
  @Watch("isActive")
  changeActive(value: boolean) {
    this.$emit("state", value);
  }
  pressEscape(pressed: boolean) {
    if (this.isActive) {
      this.close();
    }
  }
}
</script>

<style lang="scss" scoped>
t-modal-root {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0px;
  left: 0px;
  background-color: var(--color-modal);
  color: var(--color-font);
  overflow: hidden;
  display: block;
  &.no-background {
    background-color: transparent;
  }
  >t-modal {
    width: 600px;
    background-color: var(--color-main);
    padding: 16px;
    border-radius: var(--rounded);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    >t-buttons {
      text-align: right;
      display: block;
      >t-button {
        font-family: Segoe MDL2 Assets,
          "Helvetica Neue",
          Arial,
          "Hiragino Kaku Gothic ProN",
          "Hiragino Sans",
          Meiryo,
          sans-serif;
        cursor: pointer;
      }
    }
    >t-content {
      flex: 1;
      overflow: hidden;
      display: block;
    }
  }
}
</style>