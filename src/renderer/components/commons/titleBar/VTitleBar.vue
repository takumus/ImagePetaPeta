<template>
  <t-titlebar-root>
    <t-title>
      <t-icon>{{ title }}</t-icon>
    </t-title>
    <t-content>
      <t-top>
        <!-- -->
      </t-top>
      <t-bottom>
        <t-draggable
          class="left"
          :class="{
            mac: systemInfo.platform === 'darwin',
          }">
        </t-draggable>
        <slot></slot>
        <t-draggable class="right"> </t-draggable>
      </t-bottom>
    </t-content>
    <t-window-buttons v-if="!isMac">
      <t-window-button v-if="resizable" @click="minimizeWindow">
        <t-icon>&#xe921;</t-icon>
      </t-window-button>
      <t-window-button v-if="resizable" @click="maximizeWindow">
        <t-icon>&#xe922;</t-icon>
      </t-window-button>
      <t-window-button class="close" @click="closeWindow">
        <t-icon>&#xe8bb;</t-icon>
      </t-window-button>
    </t-window-buttons>
  </t-titlebar-root>
</template>

<script setup lang="ts">
import { computed } from "vue";

import { WindowType } from "@/commons/datas/windowType";

import { IPC } from "@/renderer/libs/ipc";
import { useSystemInfoStore } from "@/renderer/stores/systemInfoStore/useSystemInfoStore";
import { useWindowTypeStore } from "@/renderer/stores/windowTypeStore/useWindowTypeStore";

const { windowType } = useWindowTypeStore();
const { systemInfo } = useSystemInfoStore();
defineProps<{
  title?: string;
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
  return windowType.value !== WindowType.SETTINGS;
});
const isMac = computed(() => {
  return systemInfo.value.platform === "darwin";
});
</script>

<style lang="scss" scoped>
t-titlebar-root {
  --tab-height: 24px;
  --top-draggable-height: 10px;
  background-color: var(--color-1);
  min-height: var(--tab-height);
  display: flex;
  position: relative;
  > t-title {
    position: absolute;
    height: 100%;
    width: 100%;
    display: flex;
    align-items: center;
    pointer-events: none;
    > t-icon {
      width: 100%;
      text-align: center;
      display: inline-block;
      font-size: var(--size-0);
    }
  }
  > t-content {
    flex-grow: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    > t-top {
      flex-grow: 1;
      -webkit-app-region: drag;
      display: block;
      height: var(--top-draggable-height);
    }
    > t-bottom {
      display: flex;
      flex-direction: row;
      > t-draggable {
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
  > t-window-buttons {
    display: flex;
    > t-window-button {
      display: flex;
      padding: 0px 16px;
      align-items: center;
      > t-icon {
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
