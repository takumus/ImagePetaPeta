<template>
  <article
    class="titlebar-root"
    :style="{
      zIndex: zIndex
    }"
  >
    <section
      class="titlebar"
    >
      <section class="titlebar-and-tab">
        <section class="draggable">
          <!-- {{title}} -->
        </section>
        <div class="bottom">
          <span
            class="draggable-left"
            :class="{
              mac: $systemInfo.platform == 'darwin'
            }"
          >
          </span>
          <slot></slot>
        </div>
      </section>
      <section
        class="window-buttons"
        v-if="!isMac"
      >
        <span
          @click="minimizeWindow"
          class="window-button"
        >
          <span class="icon">&#xe921;</span>
        </span>
        <span
          @click="maximizeWindow"
          class="window-button">
            <span class="icon">&#xe922;</span>
          </span>
        <span
          @click="closeWindow"
          class="window-button close">
            <span class="icon">&#xe8bb;</span>
          </span>
      </section>
    </section>
  </article>
</template>

<script lang="ts">
// Vue
import { Options, Vue } from "vue-class-component";
import { Prop, Ref, Watch } from "vue-property-decorator";
// Components
// Others
import { API } from "@/rendererProcess/api";
@Options({
  components: {
  },
  emits: [
  ]
})
export default class VTitleBar extends Vue {
  @Prop()
  zIndex!: number;
  mounted() {
    //
  }
  unmounted() {
    //
  }
  minimizeWindow() {
    API.send("windowMinimize");
  }
  maximizeWindow() {
    API.send("windowMaximize");
  }
  closeWindow() {
    API.send("windowClose");
  }
  get isMac() {
    return this.$systemInfo.platform == "darwin";
  }
}
</script>

<style lang="scss" scoped>
.titlebar-root {
  --tab-height: 24px;
  --top-draggable-height: 10px;
  // position: fixed;
  top: 0px;
  left: 0px;
  width: 100%;
  >.titlebar {
    width: 100%;
    background-color: var(--tab-bg-color);
    min-height: var(--tab-height);
    display: flex;
    >.titlebar-and-tab {
      flex-grow: 1;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      >.draggable {
        flex-grow: 1;
        -webkit-app-region: drag;
        display: block;
        height: var(--top-draggable-height);
      }
      >.bottom {
        display: flex;
        flex-direction: row;
        >.draggable-left {
          flex-grow: 0;
          -webkit-app-region: drag;
          width: calc(var(--tab-height) + var(--top-draggable-height));
          &.mac {
            width: calc(var(--tab-height) + var(--top-draggable-height) + 32px);
          }
        }
      }
    }
    >.window-buttons {
      display: flex;
      >.window-button {
        display: flex;
        padding: 0px 16px;
        align-items: center;
        >.icon {
          display: inline-block;
          font-size: 6px;
          font-family: Segoe MDL2 Assets;
        }
        &:hover {
          background-color: var(--window-buttons-hover);
          &.close {
            color: #ffffff;
            background-color: var(--window-buttons-close-hover);
          }
        }
      }
    }
  }
}
</style>