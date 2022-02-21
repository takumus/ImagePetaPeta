<template>
  <article
    class="dialog-root"
    v-show="visible"
    :style=" {
      zIndex: zIndex
    }"
  >
    <div
      class="modal"
      :style="centerStyle"
    >
      <div class="content">
        <p>
          {{label}}
        </p>
        <div>
          <button
            v-for="(item, index) in items"
            :key="item"
            @click="select(index)"
            tabindex="-1"
          >
            {{item}}
          </button>
        </div>
      </div>
    </div>
  </article>
</template>

<script lang="ts">
// Vue
import { Options, Vue } from "vue-class-component";
import { Prop, Ref, Watch } from "vue-property-decorator";
// Others
@Options({
  components: {
  },
})
export default class VModal extends Vue {
  visible = false;
  @Prop()
  zIndex = 0;
  items: string[] = [];
  label = "";
  resolve: (index: number) => void = (index: number) => index;
  centerStyle = {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)"
  }
  async mounted() {
    this.$globalComponents.dialog = this;
  }
  unmounted() {
    //
  }
  select(index: number) {
    console.log(index);
    this.resolve(index);
    this.visible = false;
  }
  show(label: string, items: string[]) {
    if (this.visible) {
      this.resolve(-1);
    }
    this.visible = true;
    this.label = label;
    this.items = items;
    return new Promise<number>((res) => {
      this.resolve = res;
    });
  }
}
</script>

<style lang="scss" scoped>
.dialog-root {
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
      text-align: center;
      >p {
        text-align: center;
        white-space: pre;
      }
    }
  }
}
</style>