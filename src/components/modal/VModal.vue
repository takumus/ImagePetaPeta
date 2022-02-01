<template>
  <article
    class="modal-root"
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
      <div class="title">
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
import { Prop, Ref } from "vue-property-decorator";
// Others
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
  @Prop({required: true})
  zIndex = 0;
  centerStyle = {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)"
  }
  async mounted() {
    // this.appInfo = await API.send("getAppInfo");
  }
  close() {
    this.$emit("close");
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