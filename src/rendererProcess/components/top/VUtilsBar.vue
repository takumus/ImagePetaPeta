<template>
  <t-utils-bar-root>
    <t-property>
      <slot></slot>
    </t-property>
    <t-commons class="left" v-if="visible">
      <button
        v-if="windowType === 'browser' || windowType === 'details' || windowType === 'capture'"
        tabindex="-1"
        @click="openBoard()"
      >
        <t-icon class="board"></t-icon>
      </button>
      <button
        v-if="windowType === 'board' || windowType === 'details' || windowType === 'capture'"
        tabindex="-1"
        @click="openBrowser()"
      >
        <t-icon class="browser"></t-icon>
      </button>
      <button v-if="windowType !== 'details'" tabindex="-1" @click="browseAndImportImageFiles()">
        <t-icon class="import-file"></t-icon>
      </button>
      <button v-if="windowType !== 'details'" tabindex="-1" @click="importImageDirectories()">
        <t-icon class="import-folder"></t-icon>
      </button>
      <button v-if="windowType !== 'capture'" tabindex="-1" @click="openCapture()">
        <t-icon class="import-folder"></t-icon>
      </button>
    </t-commons>
    <t-commons class="right" v-if="visible">
      <button tabindex="-1" @click="toggleNSFW">
        <t-icon :class="nsfwClass"></t-icon>
      </button>
      <button tabindex="-1" @click="openSettings">
        <t-icon class="settings"></t-icon>
      </button>
    </t-commons>
  </t-utils-bar-root>
</template>

<script setup lang="ts">
// Vue
import { computed } from "vue";
// Others
import { API } from "@/rendererProcess/api";
import { WindowType } from "@/commons/datas/windowType";
import { useNSFWStore } from "@/rendererProcess/stores/nsfwStore";
import { useWindowTypeStore } from "@/rendererProcess/stores/windowTypeStore";
import { useWindowStatusStore } from "@/rendererProcess/stores/windowStatusStore";
import { useI18n } from "vue-i18n";
import { useComponentsStore } from "@/rendererProcess/stores/componentsStore";
const nsfwStore = useNSFWStore();
const components = useComponentsStore();
const { t } = useI18n();
const { windowType } = useWindowTypeStore();
const windowStatusStore = useWindowStatusStore();
function openBoard() {
  API.send("openWindow", WindowType.BOARD);
}
function openBrowser() {
  API.send("openWindow", WindowType.BROWSER);
}
function openSettings() {
  API.send("openWindow", WindowType.SETTINGS);
}
function openCapture() {
  API.send("openWindow", WindowType.CAPTURE);
}
function browseAndImportImageFiles() {
  API.send("browseAndImportImageFiles", "files");
}
function importImageDirectories() {
  API.send("browseAndImportImageFiles", "directories");
}
async function toggleNSFW() {
  if (!nsfwStore.state.value) {
    if (
      (await components.dialog.show(t("utilsBar.nsfwConfirm"), [
        t("commons.yes"),
        t("commons.no"),
      ])) === 0
    ) {
      nsfwStore.update(true);
    }
  } else {
    nsfwStore.update(false);
  }
}
const visible = computed(() => {
  return windowStatusStore.state.value.isMainWindow || windowStatusStore.state.value.focused;
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
  background-color: var(--color-0);
  min-height: 30px;
  box-shadow: 0px 1.5px 1px 0px rgba(0, 0, 0, 0.3);
  border-bottom: solid 1px var(--color-0);
  display: block;
  z-index: 2;
  > t-commons {
    position: absolute;
    top: 0px;
    height: 100%;
    padding: var(--px-1);
    display: flex;
    flex-shrink: 1;
    text-align: left;
    justify-content: flex-end;
    &.left {
      left: 0px;
      button {
        margin-right: var(--px-1);
      }
    }
    &.right {
      right: 0px;
      button {
        margin-left: var(--px-1);
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
