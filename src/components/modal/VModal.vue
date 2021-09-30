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
      <slot></slot>
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
}
</script>

<style lang="scss" scoped>
.modal-root {
  z-index: 4;
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0px;
  left: 0px;
  background-color: rgba($color: #000000, $alpha: 0.7);
  color: var(--font-color);
  overflow: hidden;
  .modal {
    width: 600px;
    background-color: var(--bg-color);
    padding: 16px;
    border-radius: 8px;
    overflow: hidden;
  }
}
</style>