<template>
  <e-titlebar-root>
    <e-title>
      <e-icon>{{ title }}</e-icon>
    </e-title>
    <e-content>
      <e-top>
        <!-- -->
      </e-top>
      <e-bottom>
        <e-draggable
          class="left"
          :class="{
            mac: systemInfo.platform === 'darwin',
          }">
        </e-draggable>
        <slot></slot>
        <e-draggable class="right"> </e-draggable>
      </e-bottom>
    </e-content>
    <e-window-buttons v-if="!isMac && !hideControls">
      <e-window-button v-if="resizable" @click="minimizeWindow">
        <e-icon>&#xe921;</e-icon>
      </e-window-button>
      <e-window-button v-if="resizable" @click="maximizeWindow">
        <e-icon>&#xe922;</e-icon>
      </e-window-button>
      <e-window-button class="close" @click="closeWindow">
        <e-icon>&#xe8bb;</e-icon>
      </e-window-button>
    </e-window-buttons>
  </e-titlebar-root>
</template>

<script setup lang="ts">
import { computed } from "vue";

import { IPC } from "@/renderer/libs/ipc";
import { useSystemInfoStore } from "@/renderer/stores/systemInfoStore/useSystemInfoStore";
import { useWindowNameStore } from "@/renderer/stores/windowNameStore/useWindowNameStore";

const { windowName } = useWindowNameStore();
const { systemInfo } = useSystemInfoStore();
defineProps<{
  title?: string;
  hideControls?: boolean;
}>();

function minimizeWindow() {
  IPC.send("windowMinimize");
}
function maximizeWindow() {
  IPC.send("windowMaximize");
}
function closeWindow() {
  IPC.send("windowClose");
}
const resizable = computed(() => {
  return windowName.value !== "settings";
});
const isMac = computed(() => {
  return systemInfo.value.platform === "darwin";
});
</script>

<style lang="scss" scoped>
e-titlebar-root {
  --tab-height: 24px;
  --top-draggable-height: 10px;
  background-color: var(--color-1);
  min-height: var(--tab-height);
  display: flex;
  position: relative;
  > e-title {
    position: absolute;
    height: 100%;
    width: 100%;
    display: flex;
    align-items: center;
    pointer-events: none;
    > e-icon {
      width: 100%;
      text-align: center;
      display: inline-block;
      font-size: var(--size-0);
    }
  }
  > e-content {
    flex-grow: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    > e-top {
      margin-top: var(--window-resize-margin);
      margin-left: var(--window-resize-margin);
      flex-grow: 1;
      -webkit-app-region: drag;
      display: block;
      height: var(--top-draggable-height);
    }
    > e-bottom {
      display: flex;
      flex-direction: row;
      > e-draggable {
        -webkit-app-region: drag;
        display: block;
        &.left {
          flex-grow: 0;
          margin-left: var(--window-resize-margin);
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
  > e-window-buttons {
    display: flex;
    > e-window-button {
      display: flex;
      padding: 0px 16px;
      align-items: center;
      > e-icon {
        display: inline-block;
        font-size: 6px;
        font-family: Segoe MDL2 Assets;
      }
      &:hover {
        background-color: var(--color-2);
        &.close {
          color: var(--color-window-button);
          background-color: var(--window-buttons-close-hover);
        }
      }
    }
  }
}
</style>
