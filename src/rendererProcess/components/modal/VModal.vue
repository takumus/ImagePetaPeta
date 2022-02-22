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
        <span class="close" @click="close">{{$systemInfo.platform == "win32" ? "&#xe8bb;" : "×"}}</span>
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
@Options({
  components: {
  },
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
  async mounted() {
    // this.appInfo = await API.send("getAppInfo");
    this.background.addEventListener("mousedown", this.mousedown);
    this.background.addEventListener("mouseup", this.mouseup);
  }
  unmounted() {
    this.background.removeEventListener("mousedown", this.mousedown);
    this.background.removeEventListener("mouseup", this.mouseup);
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
  isActive() {
    return this.modalId == this.$components.modal.modalIds[this.$components.modal.modalIds.length - 1];
  }
  @Watch("$components.modal.modalIds")
  changeModal() {
    this.noBackground = !this.isActive();
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
  @Watch("$keyboards.escape")
  pressEscape() {
    if (this.$keyboards.escape) {
      if (this.isActive()) {
        this.close();
      }
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