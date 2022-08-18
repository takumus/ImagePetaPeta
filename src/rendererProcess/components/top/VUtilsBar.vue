<template>
  <t-utils-bar-root>
    <t-property>
      <slot></slot>
    </t-property>
    <t-shared class="left" v-if="visible">
      <button v-if="$windowType === 'browser' || $windowType === 'details'" tabindex="-1" @click="openBoard()">
        <t-icon class="board"></t-icon>
      </button>
      <button v-if="$windowType === 'board' || $windowType === 'details'" tabindex="-1" @click="openBrowser()">
        <t-icon class="browser"></t-icon>
      </button>
      <button v-if="$windowType !== 'details'" tabindex="-1" @click="$api.send('importImageFiles')">
        <t-icon class="import-file"></t-icon>
      </button>
      <button v-if="$windowType !== 'details'" tabindex="-1" @click="$api.send('importImageDirectories')">
        <t-icon class="import-folder"></t-icon>
      </button>
    </t-shared>
    <t-shared class="right" v-if="visible">
      <button tabindex="-1" @click="toggleNSFW">
        <t-icon :class="nsfwClass"></t-icon>
      </button>
      <button tabindex="-1" @click="openSettings">
        <t-icon class="settings"></t-icon>
      </button>
    </t-shared>
  </t-utils-bar-root>
</template>

<script setup lang="ts">
// Vue
import { computed, getCurrentInstance } from "vue";
// Others
import { API } from "@/rendererProcess/api";
import { WindowType } from "@/commons/datas/windowType";
import { useNSFWStore } from "@/rendererProcess/stores/nsfwStore";
const nsfwStore = useNSFWStore();
const _this = getCurrentInstance()!.proxy!;
function openBoard() {
  API.send("openWindow", WindowType.BOARD);
}
function openBrowser() {
  API.send("openWindow", WindowType.BROWSER);
}
function openSettings() {
  API.send("openWindow", WindowType.SETTINGS);
}
async function toggleNSFW() {
  if (!nsfwStore.state.value) {
    if (
      (await _this.$components.dialog.show(_this.$t("utilsBar.nsfwConfirm"), [
        _this.$t("shared.yes"),
        _this.$t("shared.no"),
      ])) === 0
    ) {
      nsfwStore.update(true);
    }
  } else {
    nsfwStore.update(false);
  }
}
const visible = computed(() => {
  return _this.$focusedWindows.isMainWindow || _this.$focusedWindows.focused;
});
const nsfwClass = computed(() => {
  return nsfwStore.state.value ? "nsfw" : "sfw";
});
</script>

<style lang="scss" scoped>
t-utils-bar-root {
  --top-draggable-height: 10px;
  width: 100%;
  position: relative;
  background-color: var(--color-main);
  min-height: 30px;
  box-shadow: 0px 2px 2px 0px rgba(0, 0, 0, 0.4);
  border-bottom: solid 1px var(--color-main);
  display: block;
  z-index: 2;
  > t-shared {
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
    &.left,
    &.right {
      > button {
        min-width: 24px;
        padding: 0px;
        height: 100%;
        margin: 0px;
        border: none;
        > t-icon {
          display: block;
          width: 100%;
          height: 100%;
          background-size: 14px;
          background-repeat: no-repeat;
          background-position: center center;
          filter: var(--filter-icon);
          &.board {
            background-image: url("~@/@assets/board.png");
          }
          &.browser {
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
          &.nsfw {
            background-image: url("~@/@assets/nsfw.png");
          }
          &.sfw {
            background-image: url("~@/@assets/sfw.png");
          }
          &.info {
            background-image: url("~@/@assets/info.png");
          }
        }
      }
    }
  }
  > t-property {
    display: block;
  }
}
</style>
