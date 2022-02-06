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
import { defineComponent } from 'vue';
import { v4 as uuid } from "uuid";
export default defineComponent({
  props: {
    visible: {
      default: false
    },
    parentStyle: {
      default: {}
    },
    childStyle: {
      default: {}
    },
    center: {
      default: false
    },
    visibleCloseButton: {
      default: true
    },
    a: {
      default: 1
    }
  },
  data() {
    return {
      zIndex: 0,
      noBackground: false,
      centerStyle: {
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)"
      },
      modalId: uuid()
    }
  },
  methods: {
    mounted() {
    // this.appInfo = await API.send("getAppInfo");
    },
    close() {
      this.$emit("close");
    },
    isActive() {
      return this.modalId == this.$globalComponents.currentModalId[this.$globalComponents.currentModalId.length - 1];
    }
  },
  watch: {
    "$globalComponents.currentModalId"() {
      this.noBackground = !this.isActive();
    },
    "visible"() {
      this.$globalComponents.currentModalId = this.$globalComponents.currentModalId.filter((id) => id != this.modalId);
      if (this.visible) {
        this.$globalComponents.currentModalId.push(this.modalId);
        this.zIndex = this.$globalComponents.currentModalZIndex + 3;
        this.$globalComponents.currentModalZIndex ++;
      }
    },
    "$keyboards.escape"() {
      if (this.$keyboards.escape) {
        if (this.isActive()) {
          this.close();
        }
      }
    }
  }
});
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