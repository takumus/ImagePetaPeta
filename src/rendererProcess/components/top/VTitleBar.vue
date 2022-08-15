<template>
  <t-titlebar-root>
    <t-title>
      <t-icon>{{title}}</t-icon>
    </t-title>
    <t-content>
      <t-top>
        <!-- -->
      </t-top>
      <t-bottom>
        <t-draggable
          class="left"
          :class="{
            mac: $systemInfo.platform === 'darwin'
          }"
        >
        </t-draggable>
        <slot></slot>
        <t-draggable
          class="right"
        >
        </t-draggable>
      </t-bottom>
    </t-content>
    <t-window-buttons
      v-if="!isMac"
    >
      <t-window-button
        v-if="resizable"
        @click="minimizeWindow"
      >
        <t-icon>&#xe921;</t-icon>
      </t-window-button>
      <t-window-button
        v-if="resizable"
        @click="maximizeWindow"
      >
        <t-icon>&#xe922;</t-icon>
      </t-window-button>
      <t-window-button
        class="close"
        @click="closeWindow"
      >
        <t-icon>&#xe8bb;</t-icon>
      </t-window-button>
    </t-window-buttons>
  </t-titlebar-root>
</template>

<script lang="ts">
// Vue
import { Options, Vue } from "vue-class-component";
import { Prop, Ref, Watch } from "vue-property-decorator";
// Components
// Others
import { API } from "@/rendererProcess/api";
import { WindowType } from "@/commons/datas/windowType";
@Options({
  components: {
  },
  emits: [
  ]
})
export default class VTitleBar extends Vue {
  @Prop()
  title!: string;
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
  get resizable() {
    return this.$windowType !== WindowType.SETTINGS;
  }
  get isMac() {
    return this.$systemInfo.platform === "darwin";
  }
}
</script>

<style lang="scss" scoped>
t-titlebar-root {
  --tab-height: 24px;
  --top-draggable-height: 10px;
  background-color: var(--color-sub);
  min-height: var(--tab-height);
  display: flex;
  position: relative;
  >t-title {
    position: absolute;
    height: 100%;
    width: 100%;
    display: flex;
    align-items: center;
    pointer-events: none;
    >t-icon {
      width: 100%;
      text-align: center;
      display: inline-block;
      font-size: 0.9em;
    }
  }
  >t-content {
    flex-grow: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    >t-top {
      flex-grow: 1;
      -webkit-app-region: drag;
      display: block;
      height: var(--top-draggable-height);
    }
    >t-bottom {
      display: flex;
      flex-direction: row;
      >t-draggable {
        -webkit-app-region: drag;
        display: block;
        &.left {
          flex-grow: 0;
          width: calc(var(--tab-height) + var(--top-draggable-height));
          &.mac {
            width: calc(var(--tab-height) + var(--top-draggable-height) + 32px);
          }
        }
        &.right {
          flex-grow: 1;
          -webkit-app-region: drag;
        }
      }
    }
  }
  >t-window-buttons {
    display: flex;
    >t-window-button {
      display: flex;
      padding: 0px 16px;
      align-items: center;
      >t-icon {
        display: inline-block;
        font-size: 6px;
        font-family: Segoe MDL2 Assets;
      }
      &:hover {
        background-color: var(--color-hover);
        &.close {
          color: #ffffff;
          background-color: var(--window-buttons-close-hover);
        }
      }
    }
  }
}
</style>