<template>
  <e-window-root>
    <e-top>
      <VTitleBar :title="t('titles.web')"> </VTitleBar>
    </e-top>
    <e-content>
      <e-accesses>
        <e-access v-for="urlAndQR in webURLData">
          <img :src="urlAndQR.image" />
          <e-name>
            {{ urlAndQR.name }}
          </e-name>
          <e-url class="url" @click="IPC.common.openURL(urlAndQR.url)">
            {{ urlAndQR.url.replace(/\?.*/g, "***") }}
          </e-url>
        </e-access>
      </e-accesses>
    </e-content>
    <VContextMenu :z-index="4" />
    <VTooltip :z-index="3" />
  </e-window-root>
</template>

<script setup lang="ts">
import * as QR from "qrcode";
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

import VTitleBar from "@/renderer/components/commons/titleBar/VTitleBar.vue";
import VContextMenu from "@/renderer/components/commons/utils/contextMenu/VContextMenu.vue";
import VTooltip from "@/renderer/components/commons/utils/tooltip/VTooltip.vue";

import { ppa } from "@/commons/utils/pp";

import { IPC } from "@/renderer/libs/ipc";
import { useAppInfoStore } from "@/renderer/stores/appInfoStore/useAppInfoStore";
import { useStyleStore } from "@/renderer/stores/styleStore/useStyleStore";
import { useWindowNameStore } from "@/renderer/stores/windowNameStore/useWindowNameStore";
import { useWindowTitleStore } from "@/renderer/stores/windowTitleStore/useWindowTitleStore";
import { defaultStyles } from "@/renderer/styles/styles";

const windowTitleStore = useWindowTitleStore();
const windowNameStore = useWindowNameStore();
const appInfoStore = useAppInfoStore();
const { t } = useI18n();
const styleStore = useStyleStore();
const webURLData = ref<{ url: string; image: string; name: string }[]>([]);
onMounted(async () => {
  //
});
watch(
  styleStore.style,
  async () => {
    webURLData.value = [];
    const webURLs = await IPC.common.getWebURL();
    await ppa(async (name) => {
      webURLData.value.push(
        ...(await ppa(async (url) => {
          const image = await QR.toDataURL(url, {
            color: {
              light: styleStore.style.value["--color-0"],
              dark: styleStore.style.value["--color-font"],
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
e-window-root {
  > e-content {
    > e-accesses {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--px-3);
      width: 100%;
      height: 100%;
      overflow-y: auto;
      > e-access {
        display: flex;
        flex-grow: 0;
        flex-direction: column;
        align-items: center;
        gap: var(--px-2);
        z-index: 1;
        background-color: var(--color-0);
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
</style>
<style lang="scss">
@use "@/renderer/styles/index.scss" as *;
</style>
