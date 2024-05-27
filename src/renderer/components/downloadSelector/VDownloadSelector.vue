<template>
  <e-download-selector-root>
    <e-image v-for="image in images" :key="image.data.url">
      <VSelectableBox :selected="false">
        <template #content>
          <e-content>
            <img :src="image.dataURI" loading="lazy" decoding="async" />
          </e-content>
        </template>
      </VSelectableBox>
    </e-image>
  </e-download-selector-root>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";

import VSelectableBox from "../commons/utils/selectableBox/VSelectableBox.vue";

import { DownloadSelectorData } from "@/commons/datas/downloadSelectorData";

import { IPC } from "@/renderer/libs/ipc";

type Data = Omit<DownloadSelectorData, "urls" | "referer"> & { url: string };
const images = ref<{ dataURI: string; data: Data }[]>([]);
const fetchImagePromises: { [key: string]: Promise<string> } = {};
onMounted(async () => {
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
      const promise = (fetchImagePromises[url] = IPC.fetchAndCreateDataURI(url, init));
      promise
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
</script>

<style lang="scss" scoped>
e-download-selector-root {
  display: flex;
  flex-wrap: wrap;
  gap: var(--px-2);
  will-change: scroll-position;
  padding: 0px;
  width: 100%;
  height: 100%;
  overflow-y: auto;
  > e-image {
    display: block;
    width: 300px;
    height: 300px;
    e-content {
      display: block;
      width: 100%;
      height: 100%;
      > img {
        width: 100%;
        height: 100%;
        object-fit: contain;
      }
    }
  }
}
</style>
