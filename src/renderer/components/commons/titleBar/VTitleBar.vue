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
  display: flex;
  position: relative;
  background-color: var(--color-1);
  min-height: var(--tab-height);
  > e-title {
    display: flex;
    position: absolute;
    align-items: center;
    width: 100%;
    height: 100%;
    pointer-events: none;
    > e-icon {
      display: inline-block;
      width: 100%;
      font-size: var(--size-0);
      text-align: center;
    }
  }
  > e-content {
    display: flex;
    flex-grow: 1;
    flex-direction: column;
    overflow: hidden;
    > e-top {
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
      align-items: center;
      padding: 0px 16px;
      > e-icon {
        display: inline-block;
        font-size: 6px;
        font-family: Segoe MDL2 Assets;
      }
      &:hover {
        background-color: var(--color-2);
        &.close {
          background-color: var(--window-buttons-close-hover);
          color: var(--color-window-button);
        }
      }
    }
  }
}
</style>
