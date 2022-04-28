<template>
  <v-titlebar-root>
    <v-content>
      <v-top>
        <!-- {{title}} -->
      </v-top>
      <v-bottom>
        <v-draggable
          class="left"
          :class="{
            mac: $systemInfo.platform == 'darwin'
          }"
        >
        </v-draggable>
        <slot></slot>
        <v-draggable
          class="right"
        >
        </v-draggable>
      </v-bottom>
    </v-content>
    <v-window-buttons
      v-if="!isMac"
    >
      <v-window-button
        @click="minimizeWindow"
      >
        <v-icon>&#xe921;</v-icon>
      </v-window-button>
      <v-window-button
        @click="maximizeWindow"
      >
        <v-icon>&#xe922;</v-icon>
      </v-window-button>
      <v-window-button
        class="close"
        @click="closeWindow"
      >
        <v-icon>&#xe8bb;</v-icon>
      </v-window-button>
    </v-window-buttons>
  </v-titlebar-root>
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
v-titlebar-root {
  --tab-height: 24px;
  --top-draggable-height: 10px;
  background-color: var(--tab-bg-color);
  min-height: var(--tab-height);
  display: flex;
  >v-content {
    flex-grow: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    >v-top {
      flex-grow: 1;
      -webkit-app-region: drag;
      display: block;
      height: var(--top-draggable-height);
    }
    >v-bottom {
      display: flex;
      flex-direction: row;
      >v-draggable {
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
  v-window-buttons {
    display: flex;
    >v-window-button {
      display: flex;
      padding: 0px 16px;
      align-items: center;
      >v-icon {
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
</style>