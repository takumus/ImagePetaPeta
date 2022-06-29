<template>
  <t-dialog-root
    v-show="visible"
    :style=" {
      zIndex: zIndex
    }"
  >
    <t-modal>
      <t-content>
        <p>
          {{label}}
        </p>
        <t-buttons>
          <button
            v-for="(item, index) in items"
            :key="item"
            @click="select(index)"
            tabindex="-1"
          >
            {{item}}
          </button>
        </t-buttons>
      </t-content>
    </t-modal>
  </t-dialog-root>
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
  @Prop()
  zIndex = 0;
  items: string[] = [];
  label = "";
  visible = false;
  resolve: (index: number) => void = (index: number) => index;
  async mounted() {
    this.$components.dialog = this;
  }
  unmounted() {
    //
  }
  select(index: number) {
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
t-dialog-root {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0px;
  left: 0px;
  background-color: var(--modal-bg-color);
  color: var(--font-color);
  overflow: hidden;
  display: block;
  &.no-background {
    background-color: transparent;
  }
  >t-modal {
    background-color: var(--bg-color);
    padding: 16px;
    border-radius: var(--rounded);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    >t-content {
      flex: 1;
      overflow: hidden;
      text-align: center;
      display: block;
      >p {
        text-align: center;
        word-break: break-word;
        white-space: pre-wrap;
      }
      >t-buttons {
        display: block;
      }
    }
  }
}
</style>