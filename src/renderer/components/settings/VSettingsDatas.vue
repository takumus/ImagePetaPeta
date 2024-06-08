<template>
  <e-settings-content-root>
    <button @click="browsePetaFileDirectory">
      {{ t("settings.browsePetaFileDirectoryButton") }}</button
    ><br />
    <VTextarea
      :type="'single'"
      :click-to-edit="true"
      :trim="true"
      :text-area-style="{ width: '100%' }"
      :outer-style="{ width: '100%' }"
      :value="tempPetaFileDirectory"
      @update:value="(value) => (tempPetaFileDirectory = value)" />
    <br />
    <button @click="changePetaFileDirectory" :disabled="tempPetaFileDirectory === ''">
      {{ t("settings.changePetaFileDirectoryButton") }}
    </button>
    <p>{{ t("settings.changePetaFileDirectoryDescriptions") }}</p>
  </e-settings-content-root>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

import VTextarea from "@/renderer/components/commons/utils/textarea/VTextarea.vue";

import { IPC } from "@/renderer/libs/ipc";
import { useComponentsStore } from "@/renderer/stores/componentsStore/useComponentsStore";
import { useSettingsStore } from "@/renderer/stores/settingsStore/useSettingsStore";

const settingsStore = useSettingsStore();
const components = useComponentsStore();
const { t } = useI18n();
const tempPetaFileDirectory = ref("");
onMounted(() => {
  restorePetaFileDirectory();
});
async function changePetaFileDirectory() {
  const result = await IPC.common.openModal(
    t("settings.changePetaFileDirectoryDialog", [tempPetaFileDirectory.value]),
    [t("commons.yes"), t("commons.no")],
  );
  if (result === 0) {
    if (!(await IPC.common.changePetaFileDirectory(tempPetaFileDirectory.value))) {
      await IPC.common.openModal(
        t("settings.changePetaFileDirectoryErrorDialog", [tempPetaFileDirectory.value]),
        [t("commons.yes")],
      );
      restorePetaFileDirectory();
    }
  } else {
    restorePetaFileDirectory();
  }
}
function restorePetaFileDirectory() {
  tempPetaFileDirectory.value = settingsStore.state.value.petaFileDirectory.path;
}
async function browsePetaFileDirectory() {
  const path = await IPC.common.browsePetaFileDirectory();
  if (path) {
    tempPetaFileDirectory.value = path;
  }
}
watch(
  () => settingsStore.state.value.petaFileDirectory.path,
  () => {
    restorePetaFileDirectory();
  },
);
</script>

<style lang="scss" scoped></style>
<style lang="scss" scoped>
@import "@/renderer/components/settings/index.scss";
</style>
