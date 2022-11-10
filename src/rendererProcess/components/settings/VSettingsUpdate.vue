<template>
  <t-settings-content-root class="update">
    <p v-if="updateAvailable">
      {{ t("settings.updateAvailable") }}<br />
      {{ t("settings.currentVersion") }}: {{ appInfoStore.state.value.version }}<br />
      {{ t("settings.latestVersion") }}: {{ latestVersion }}<br />
      <button @click="downloadUpdate">{{ t("settings.updateButton") }}</button>
    </p>
    <p v-else>
      {{ t("settings.thisIsLatest") }}<br />
      {{ t("settings.currentVersion") }}: {{ appInfoStore.state.value.version }}<br />
      <button @click="releaseNote">{{ t("settings.releaseNoteButton") }}</button>
    </p>
    <button @click="checkUpdate">{{ t("settings.checkUpdateButton") }}</button>
  </t-settings-content-root>
</template>

<script setup lang="ts">
// Others
import { IPC } from "@/rendererProcess/ipc";
import { onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useAppInfoStore } from "@/rendererProcess/stores/appInfoStore";
import { DOWNLOAD_URL } from "@/commons/defines";
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
  IPC.send("openURL", `${DOWNLOAD_URL}${latestVersion.value}`);
}
function releaseNote() {
  IPC.send("openURL", `${DOWNLOAD_URL}${appInfoStore.state.value.version}`);
}
</script>

<style lang="scss" scoped>
t-settings-content-root.update {
  text-align: center;
  display: block;
  > p {
    font-size: var(--size-1);
    margin: 0px 16px;
    word-break: break-word;
  }
}
</style>
<style lang="scss" scoped>
@import "@/rendererProcess/components/settings/index.scss";
</style>
