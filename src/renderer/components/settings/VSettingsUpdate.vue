<template>
  <e-settings-content-root class="update">
    <e-info v-if="updateAvailable">
      <p>
        {{ t("settings.updateAvailable") }}
      </p>
      <p>{{ t("settings.currentVersion") }}: {{ appInfoStore.state.value.version }}</p>
      <p>{{ t("settings.latestVersion") }}: {{ latestVersion }}</p>
      <p>
        <button @click="downloadUpdate">{{ t("settings.updateButton") }}</button>
      </p>
    </e-info>
    <e-info v-else>
      <p>
        {{ t("settings.thisIsLatest") }}
      </p>
      <p>{{ t("settings.currentVersion") }}: {{ appInfoStore.state.value.version }}</p>
      <p>
        <button @click="releaseNote">{{ t("settings.releaseNoteButton") }}</button>
      </p>
    </e-info>
    <button @click="checkUpdate">{{ t("settings.checkUpdateButton") }}</button>
  </e-settings-content-root>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";

import { URL_DOWNLOAD } from "@/commons/defines";

import { IPC } from "@/renderer/libs/ipc";
import { useAppInfoStore } from "@/renderer/stores/appInfoStore/useAppInfoStore";

const { t } = useI18n();
const appInfoStore = useAppInfoStore();
const updateAvailable = ref(false);
const latestVersion = ref("1.1.1");
onMounted(() => {
  checkUpdate();
});
async function checkUpdate() {
  const remoteBinaryInfo = await IPC.send("getLatestVersion");
  latestVersion.value = remoteBinaryInfo.version;
  updateAvailable.value = !remoteBinaryInfo.isLatest;
}
function downloadUpdate() {
  IPC.send("openURL", `${URL_DOWNLOAD}${latestVersion.value}`);
}
function releaseNote() {
  IPC.send("openURL", `${URL_DOWNLOAD}${appInfoStore.state.value.version}`);
}
</script>

<style lang="scss" scoped>
e-settings-content-root.update {
  display: block;
  text-align: center;
  > e-info {
    display: block;
    overflow: hidden;
    > p {
      font-size: var(--size-1);
      word-break: break-word;
    }
  }
}
</style>
<style lang="scss" scoped>
@import "@/renderer/components/settings/index.scss";
</style>
