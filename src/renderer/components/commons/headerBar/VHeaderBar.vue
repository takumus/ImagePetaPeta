<template>
  <e-utils-bar-root
    :class="{
      shadow: windowName === 'board',
    }">
    <e-property>
      <slot></slot>
    </e-property>
    <e-commons class="left" v-if="visible">
      <button
        v-if="windowName !== 'board'"
        tabindex="-1"
        @click="openBoard()"
        @pointerenter="components.tooltip.open(t('tooltip.openBoard'), $event)">
        <e-icon class="board"></e-icon>
      </button>
      <button
        v-if="windowName !== 'browser'"
        tabindex="-1"
        @click="openBrowser()"
        @pointerenter="components.tooltip.open(t('tooltip.openBrowser'), $event)">
        <e-icon class="browser"></e-icon>
      </button>
      <button
        v-if="windowName !== 'details'"
        tabindex="-1"
        @click="browseAndImportFiles()"
        @pointerenter="components.tooltip.open(t('tooltip.importFiles'), $event)">
        <e-icon class="import-file"></e-icon>
      </button>
      <button
        v-if="windowName !== 'details'"
        tabindex="-1"
        @click="importImageDirectories()"
        @pointerenter="components.tooltip.open(t('tooltip.importFolders'), $event)">
        <e-icon class="import-folder"></e-icon>
      </button>
      <button
        v-if="windowName !== 'details' && settingsStore.state.value.web"
        tabindex="-1"
        @click="openWeb()"
        @pointerenter="components.tooltip.open(t('tooltip.importFromSP'), $event)">
        <e-icon class="web"></e-icon>
      </button>
      <!-- <button v-if="windowName !== 'capture'" tabindex="-1" @click="openCapture()">
        <e-icon class="import-folder"></e-icon>
      </button> -->
    </e-commons>
    <e-commons class="right" v-if="visible">
      <button
        tabindex="-1"
        @click="toggleNSFW"
        @pointerenter="components.tooltip.open(t('tooltip.toggleNSFW'), $event)">
        <e-icon :class="nsfwClass"></e-icon>
      </button>
      <button
        tabindex="-1"
        @click="openSettings"
        @pointerenter="components.tooltip.open(t('tooltip.openSettings'), $event)">
        <e-icon class="settings"></e-icon>
      </button>
    </e-commons>
  </e-utils-bar-root>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";

import { vec2FromPointerEvent } from "@/commons/utils/vec2";

import { IPC } from "@/renderer/libs/ipc";
import { useComponentsStore } from "@/renderer/stores/componentsStore/useComponentsStore";
import { useNSFWStore } from "@/renderer/stores/nsfwStore/useNSFWStore";
import { useSettingsStore } from "@/renderer/stores/settingsStore/useSettingsStore";
import { useWindowNameStore } from "@/renderer/stores/windowNameStore/useWindowNameStore";
import { useWindowStatusStore } from "@/renderer/stores/windowStatusStore/useWindowStatusStore";

const nsfwStore = useNSFWStore();
const components = useComponentsStore();
const { t } = useI18n();
const { windowName } = useWindowNameStore();
const windowStatusStore = useWindowStatusStore();
const settingsStore = useSettingsStore();
function openBoard() {
  IPC.common.openWindow("board");
}
function openBrowser() {
  IPC.common.openWindow("browser");
}
function openSettings() {
  IPC.common.openWindow("settings");
}
function openCapture() {
  IPC.common.openWindow("capture");
}
function openWeb() {
  IPC.common.openWindow("web");
}
function browseAndImportFiles() {
  IPC.common.browseAndImportFiles("files");
}
function importImageDirectories() {
  IPC.common.browseAndImportFiles("directories");
}
async function toggleNSFW() {
  if (!nsfwStore.state.value) {
    if (
      (await IPC.common.openModal(t("utilsBar.nsfwConfirm"), [
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
  return (
    windowName.value === "board" ||
    windowName.value === "details" ||
    windowName.value === "browser" ||
    windowName.value === "capture"
  );
});
const nsfwClass = computed(() => {
  return nsfwStore.state.value ? "nsfw" : "sfw";
});
</script>

<style lang="scss" scoped>
e-utils-bar-root {
  --top-draggable-height: 10px;
  display: block;
  position: relative;
  z-index: 2;
  background-color: var(--color-0);
  width: 100%;
  min-height: 30px;
  &.shadow {
    box-shadow: 0px 1px 1px 0px rgba(0, 0, 0, 0.3);
  }
  > e-commons {
    display: flex;
    position: absolute;
    top: 0px;
    flex-shrink: 1;
    justify-content: flex-end;
    padding: var(--px-1);
    height: 100%;
    text-align: left;
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
        margin: 0px;
        border: none;
        padding: 0px;
        min-width: 24px;
        height: 100%;
        > e-icon {
          display: block;
          filter: var(--filter-icon);
          background-position: center center;
          background-size: 14px;
          background-repeat: no-repeat;
          width: 100%;
          height: 100%;
          &.board {
            background-image: url("/images/icons/board.png");
          }
          &.browser {
            background-image: url("/images/icons/browser.png");
          }
          &.import-file {
            background-image: url("/images/icons/importFile.png");
          }
          &.import-folder {
            background-image: url("/images/icons/importFolder.png");
          }
          &.web {
            background-image: url("/images/icons/web.png");
          }
          &.settings {
            background-image: url("/images/icons/settings.png");
          }
          &.nsfw {
            background-image: url("/images/icons/nsfw.png");
          }
          &.sfw {
            background-image: url("/images/icons/sfw.png");
          }
          &.info {
            background-image: url("/images/icons/info.png");
          }
        }
      }
    }
  }
  > e-property {
    display: block;
  }
}
</style>
