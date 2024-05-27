<template>
  <e-page-downloader-root>
    <e-image v-for="image in images" :key="image.data.url">
      <VSelectableBox :selected="false">
        <template #content>
          <e-content>
            <img :src="image.cacheURL" loading="lazy" decoding="async" />
          </e-content>
        </template>
      </VSelectableBox>
    </e-image>
  </e-page-downloader-root>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";

import VSelectableBox from "../commons/utils/selectableBox/VSelectableBox.vue";

import { PageDownloaderData } from "@/commons/datas/pageDownloaderData";
import { PROTOCOLS } from "@/commons/defines";

import { IPC } from "@/renderer/libs/ipc";

type Data = Omit<PageDownloaderData, "urls" | "referer"> & { url: string };
const images = ref<{ cacheURL: string; data: Data }[]>([]);
const fetchImagePromises: { [key: string]: Promise<string> } = {};
onMounted(async () => {
  IPC.on("updatePageDownloaderDatas", (_, urls) => {
    order(urls);
  });
  order(await IPC.getPageDownloaderDatas());
});
function order(datas: PageDownloaderData[]) {
  datas.forEach((data) => {
    data.urls.forEach((url) => {
      if (fetchImagePromises[url] !== undefined) {
        return;
      }
      images.value.unshift({
        cacheURL: url.startsWith("data")
          ? url
          : `${PROTOCOLS.FILE.IMAGE_PAGE_DOWNLOADER_CACHE}://?url=${encodeURIComponent(url)}&referer=${encodeURIComponent(data.referer)}`,
        data: {
          pageTitle: data.pageTitle,
          pageURL: data.pageURL,
          url,
        },
      });
    });
  });
}
</script>

<style lang="scss" scoped>
e-page-downloader-root {
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
