<template>
  <e-page-downloader-root>
    <e-image v-for="image in images" :key="image.url">
      <VSelectableBox :selected="image.selected">
        <template #content>
          <e-content @click="click(image)">
            <img :src="image.cacheURL" loading="lazy" decoding="async" />
          </e-content>
        </template>
      </VSelectableBox>
    </e-image>
  </e-page-downloader-root>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";

import VSelectableBox from "../commons/utils/selectableBox/VSelectableBox.vue";

import { PageDownloaderData } from "@/commons/datas/pageDownloaderData";
import { PROTOCOLS } from "@/commons/defines";

import { IPC } from "@/renderer/libs/ipc";

type Data = Omit<PageDownloaderData, "urls" | "referer"> & {
  url: string;
  selected: boolean;
  cacheURL: string;
};
const images = ref<Data[]>([]);
onMounted(async () => {
  IPC.on("updatePageDownloaderDatas", (_, urls) => {
    order(urls);
  });
  order(await IPC.getPageDownloaderDatas());
});
function click(data: Data) {
  console.log(data);
  IPC.importFiles([
    [
      {
        type: "url",
        additionalData: {
          name: data.pageTitle,
          note: data.pageURL,
        },
        url: data.cacheURL,
      },
    ],
  ]);
}
function order(datas: PageDownloaderData[]) {
  datas.forEach((data) => {
    data.urls.forEach((url) => {
      images.value.unshift({
        cacheURL: url.startsWith("data")
          ? url
          : `${PROTOCOLS.FILE.IMAGE_PAGE_DOWNLOADER_CACHE}://?url=${encodeURIComponent(url)}&referer=${encodeURIComponent(data.referer)}`,
        pageTitle: data.pageTitle,
        pageURL: data.pageURL,
        url,
        selected: false,
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
