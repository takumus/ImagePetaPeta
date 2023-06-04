<template>
  <e-root>
    <e-content>
      <e-top>
        <VTitleBar :title="t('titles.web')"> </VTitleBar>
      </e-top>
      <e-browser>
        <e-accesses>
          <e-access v-for="urlAndQR in webURLData">
            <img :src="urlAndQR.image" />
            <e-name>
              {{ urlAndQR.name }}
            </e-name>
            <e-url class="url" @click="IPC.send('openURL', urlAndQR.url)">
              {{ urlAndQR.url }}
            </e-url>
          </e-access>
        </e-accesses>
      </e-browser>
    </e-content>
    <VContextMenu :z-index="4" />
  </e-root>
</template>

<script setup lang="ts">
import * as QR from "qrcode";
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

import VTitleBar from "@/renderer/components/commons/titleBar/VTitleBar.vue";
import VContextMenu from "@/renderer/components/commons/utils/contextMenu/VContextMenu.vue";

import { ppa } from "@/commons/utils/pp";

import { IPC } from "@/renderer/libs/ipc";
import { useAppInfoStore } from "@/renderer/stores/appInfoStore/useAppInfoStore";
import { useDarkModeStore } from "@/renderer/stores/darkModeStore/useDarkModeStore";
import { useWindowNameStore } from "@/renderer/stores/windowNameStore/useWindowNameStore";
import { useWindowTitleStore } from "@/renderer/stores/windowTitleStore/useWindowTitleStore";
import { defaultStyles } from "@/renderer/styles/styles";

const windowTitleStore = useWindowTitleStore();
const windowNameStore = useWindowNameStore();
const appInfoStore = useAppInfoStore();
const { t } = useI18n();
const darkModeStore = useDarkModeStore();
const webURLData = ref<{ url: string; image: string; name: string }[]>([]);
onMounted(async () => {
  //
});
watch(
  darkModeStore.state,
  async () => {
    webURLData.value = [];
    const webURLs = await IPC.send("getWebURL");
    await ppa(async (name) => {
      webURLData.value.push(
        ...(await ppa(async (url) => {
          const image = await QR.toDataURL(url, {
            color: {
              light: defaultStyles[darkModeStore.state.value ? "dark" : "light"]["--color-0"],
              dark: defaultStyles[darkModeStore.state.value ? "dark" : "light"]["--color-font"],
            },
            scale: 20,
          });
          return {
            url,
            name,
            image,
          };
        }, webURLs[name]).promise),
      );
    }, Object.keys(webURLs)).promise;
  },
  { immediate: true },
);
watch(
  () => `${t(`titles.${windowNameStore.windowName.value}`)} - ${appInfoStore.state.value.name}`,
  (value) => {
    windowTitleStore.windowTitle.value = value;
  },
  { immediate: true },
);
</script>

<style lang="scss" scoped>
e-root {
  background-color: var(--color-0);
  color: var(--color-font);
  > e-content {
    position: fixed;
    top: 0px;
    left: 0px;
    display: flex;
    height: 100%;
    width: 100%;
    flex-direction: column;
    background-color: var(--color-0);
    color: var(--color-font);
    > e-top {
      display: block;
      width: 100%;
      z-index: 2;
    }
    > e-browser {
      display: flex;
      flex: 1;
      width: 100%;
      overflow: hidden;
      padding: var(--px-2);
      > e-accesses {
        display: flex;
        width: 100%;
        align-items: center;
        flex-direction: column;
        overflow-y: auto;
        gap: var(--px-3);
        > e-access {
          display: flex;
          flex-direction: column;
          align-items: center;
          background-color: var(--color-0);
          z-index: 1;
          flex-grow: 0;
          gap: var(--px-2);
          > img {
            width: 200px;
            pointer-events: none;
          }
          > e-name {
            display: block;
          }
          > e-url {
            display: block;
            cursor: pointer;
            text-decoration: underline;
          }
        }
      }
    }
  }
}
</style>
<style lang="scss">
@import "@/renderer/styles/index.scss";
</style>