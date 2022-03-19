<template>
  <article
    class="modal-root"
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
    <div
      class="modal"
      :style="childStyle ? {
        ...childStyle,
        ...(center ? centerStyle : {})
      } : (center ? centerStyle : {})"
    >
      <div class="title" v-if="visibleCloseButton">
        <span class="close" @click="close" v-html="$texts.close"></span>
      </div>
      <div class="content">
        <slot></slot>
      </div>
    </div>
  </article>
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
    this.background.addEventListener("mousedown", this.mousedown);
    this.background.addEventListener("mouseup", this.mouseup);
    this.keyboards.enabled = true;
    this.keyboards.down(["escape"], this.pressEscape);
  }
  unmounted() {
    this.background.removeEventListener("mousedown", this.mousedown);
    this.background.removeEventListener("mouseup", this.mouseup);
    this.keyboards.destroy();
  }
  close() {
    this.$emit("close");
  }
  mousedown(event: MouseEvent) {
    this.clickBackground = event.target == this.background;
  }
  mouseup(event: MouseEvent) {
    if (event.target == this.background && this.clickBackground) {
      this.close();
      this.clickBackground = false;
    }
  }
  get isActive() {
    return this.modalId == this.$components.modal.modalIds[this.$components.modal.modalIds.length - 1];
  }
  @Watch("$components.modal.modalIds")
  changeModal() {
    this.noBackground = !this.isActive;
  }
  @Watch("visible")
  changeVisible() {
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
.modal-root {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0px;
  left: 0px;
  background-color: var(--modal-bg-color);
  color: var(--font-color);
  overflow: hidden;
  &.no-background {
    background-color: transparent;
  }
  >.modal {
    width: 600px;
    background-color: var(--bg-color);
    padding: 16px;
    border-radius: var(--rounded);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    >.title {
      text-align: right;
      >.close {
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
    >.content {
      flex: 1;
      overflow: hidden;
    }
  }
}
</style>