<template>
  <t-utils-bar-root>
    <t-property>
      <slot></slot>
    </t-property>
    <t-shared class="left" v-if="visible">
      <button
        tabindex="-1"
        @click="open"
      >
        <t-icon :class="$windowType"></t-icon>
      </button>
      <button
        tabindex="-1"
        @click="$api.send('importImageFiles')"
      >
        <t-icon class="import-file"></t-icon>
      </button>
      <button
        tabindex="-1"
        @click="$api.send('importImageDirectories')"
      >
        <t-icon class="import-folder"></t-icon>
      </button>
    </t-shared>
    <t-shared class=" right" v-if="visible">
      <!-- <button
        tabindex="-1"
        @click="openSettings"
      >
        <t-icon class="info"></t-icon>
      </button> -->
      <button
        tabindex="-1"
        @click="openSettings"
      >
        <t-icon class="settings"></t-icon>
      </button>
    </t-shared>
  </t-utils-bar-root>
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
export default class VUtilsBar extends Vue {
  mounted() {
    //
  }
  unmounted() {
    //
  }
  open() {
    if (this.$windowType === WindowType.BOARD) {
      API.send("openBrowser");
    } else if (this.$windowType === WindowType.BROWSER) {
      API.send("openBoard");
    }
  }
  openSettings() {
    API.send("openSettings");
  }
  get visible() {
    return this.$focusedWindows.isMainWindow || this.$focusedWindows.focused;
  }
}
</script>

<style lang="scss" scoped>
t-utils-bar-root {
  --top-draggable-height: 10px;
  width: 100%;
  position: relative;
  background-color: var(--tab-selected-color);
  min-height: 30px;
  box-shadow: -1px 2px 2px 0px rgba(0, 0, 0, 0.4);
  border-bottom: solid 1px var(--bg-color);
  display: block;
  >t-shared {
    position: absolute;
    top: 0px;
    height: 30px;
    padding: 4px;
    display: flex;
    flex-shrink: 1;
    text-align: left;
    justify-content: flex-end;
    &.left {
      left: 0px;
      button {
        margin-right: 4px;
      }
    }
    &.right {
      right: 0px;
      button {
        margin-left: 4px;
      }
    }
    &.left, &.right {
      >button {
        min-width: 24px;
        padding: 0px;
        height: 100%;
        margin: 0px;
        border: none;
        >t-icon {
          display: block;
          width: 100%;
          height: 100%;
          background-size: 14px;
          background-repeat: no-repeat;
          background-position: center center;
          filter: var(--icon-filter);
          &.browser {
            background-image: url("~@/@assets/board.png");
          }
          &.board {
            background-image: url("~@/@assets/browser.png");
          }
          &.import-file {
            background-image: url("~@/@assets/importFile.png");
          }
          &.import-folder {
            background-image: url("~@/@assets/importFolder.png");
          }
          &.settings {
            background-image: url("~@/@assets/settings.png");
          }
          &.info {
            background-image: url("~@/@assets/info.png");
          }
        }
      }
    }
  }
  >t-property {
    display: block;
  }
}
</style>