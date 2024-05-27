<template>
  <e-window-root>
    <e-top>
      <VTitleBar :title="t('titles.details')"> </VTitleBar>
    </e-top>
    <e-content>
      <img
        v-for="image in images"
        :src="image.dataURI"
        loading="lazy"
        decoding="async"
        :key="image.data.url" />
    </e-content>
    <e-modals v-show="components.modal.modalIds.length > 0">
      <VTasks />
    </e-modals>
    <VContextMenu :z-index="4" />
    <VTooltip :z-index="3" />
  </e-window-root>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

import VTitleBar from "@/renderer/components/commons/titleBar/VTitleBar.vue";
import VContextMenu from "@/renderer/components/commons/utils/contextMenu/VContextMenu.vue";
import VTasks from "@/renderer/components/commons/utils/task/VTasks.vue";
import VTooltip from "@/renderer/components/commons/utils/tooltip/VTooltip.vue";

import { DownloadSelectorData } from "@/commons/datas/downloadSelectorData";

// import { AnimatedGIFLoader } from "@/renderer/libs/pixi-gif";
import { IPC } from "@/renderer/libs/ipc";
import { Keyboards } from "@/renderer/libs/keyboards";
import { useAppInfoStore } from "@/renderer/stores/appInfoStore/useAppInfoStore";
import { useComponentsStore } from "@/renderer/stores/componentsStore/useComponentsStore";
import { useWindowNameStore } from "@/renderer/stores/windowNameStore/useWindowNameStore";
import { useWindowTitleStore } from "@/renderer/stores/windowTitleStore/useWindowTitleStore";

type Data = Omit<DownloadSelectorData, "urls" | "referer"> & { url: string };
const appInfoStore = useAppInfoStore();
const components = useComponentsStore();
const { t } = useI18n();
const windowNameStore = useWindowNameStore();
const windowTitleStore = useWindowTitleStore();
const keyboards = new Keyboards();
const images = ref<{ dataURI: string; data: Data }[]>([]);
const fetchImagePromises: { [key: string]: Promise<string> } = {};
onMounted(async () => {
  keyboards.enabled = true;
  keyboards.keys("Escape").up(() => {
    IPC.windowClose();
  });
  IPC.on("updateDownloadSelectorURLs", (_, urls) => {
    order(urls);
  });
  order(await IPC.getDownloadSelectorURLs());
});
function order(datas: DownloadSelectorData[]) {
  datas.forEach((data) => {
    data.urls.forEach((url) => {
      if (fetchImagePromises[url] !== undefined) {
        return;
      }
      const init: RequestInit = {
        headers: {
          Referer: data.referer,
          method: "GET",
        },
      };
      fetchImagePromises[url] = (async () => IPC.fetchAndCreateDataURI(url, init))();
      fetchImagePromises[url]
        .then((url) => {
          images.value.unshift({
            dataURI: url,
            data: {
              pageTitle: data.pageTitle,
              pageURL: data.pageURL,
              url,
            },
          });
        })
        .catch(() => {
          //
        });
    });
  });
}

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
    display: block;
    will-change: scroll-position;
    padding: 0px;
    overflow-y: auto;
    > img {
      width: 20%;
      object-fit: contain;
    }
  }
  > e-modals {
    position: absolute;
    top: 0px;
    left: 0px;
    z-index: 3;
    width: 100%;
    height: 100%;
  }
}
</style>
<style lang="scss">
@import "@/renderer/styles/index.scss";
</style>
