<template>
  <e-settings-content-root class="update">
    <e-info v-for="urlAndQR in urlAndQRs">
      <img :src="urlAndQR.image" />
      <p class="url" @click="IPC.send('openURL', urlAndQR.url)">
        {{ urlAndQR.url }}
      </p>
    </e-info>
  </e-settings-content-root>
</template>

<script setup lang="ts">
import * as QR from "qrcode";
import { onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";

import { ppa } from "@/commons/utils/pp";

import { IPC } from "@/renderer/libs/ipc";

const { t } = useI18n();
const urlAndQRs = ref<{ url: string; image: string }[]>([]);
onMounted(async () => {
  await ppa(async (urls) => {
    urlAndQRs.value.push(
      ...(await ppa(async (url) => {
        const image = await QR.toDataURL(url);
        return {
          url,
          image,
        };
      }, urls).promise),
    );
  }, Object.values(await IPC.send("getSPURLs"))).promise;
});
</script>

<style lang="scss" scoped>
e-settings-content-root.update {
  text-align: center;
  display: block;
  > e-info {
    display: block;
    overflow: hidden;
    > p {
      font-size: var(--size-1);
      word-break: break-word;
      &.url {
        cursor: pointer;
        text-decoration: underline;
      }
    }
  }
}
</style>
<style lang="scss" scoped>
@import "@/renderer/components/settings/index.scss";
</style>
