<template>
  <e-settings-content-root>
    <button v-show="regenerateCompleted" @click="regeneratePetaFiles">
      {{ t("settings.regeneratePetaFilesButton") }}
    </button>
    <label v-show="!regenerateCompleted">
      {{ regeneratePetaFilesDone }}/{{ regeneratePetaFilesCount }}
    </label>
    <p>{{ t("settings.regeneratePetaFilesDescriptions") }}</p>
    <label>
      <VCheckbox v-model:value="settingsStore.state.value.loadTilesInOriginal" />
      {{ t("settings.loadTilesInOriginal") }}
    </label>
    <p>{{ t("settings.loadTilesInOriginalDescriptions") }}</p>
    <label>
      <VCheckbox v-model:value="settingsStore.state.value.showTagsOnTile" />
      {{ t("settings.showTagsOnTile") }}
    </label>
    <p>{{ t("settings.showTagsOnTileDescriptions") }}</p>
  </e-settings-content-root>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";

import VCheckbox from "@/renderer/components/commons/utils/checkbox/VCheckbox.vue";

import { IPC } from "@/renderer/libs/ipc";
import { useSettingsStore } from "@/renderer/stores/settingsStore/useSettingsStore";

const settingsStore = useSettingsStore();
const { t } = useI18n();
const regenerateCompleted = ref(true);
const regeneratePetaFilesDone = ref(0);
const regeneratePetaFilesCount = ref(0);
onMounted(() => {
  IPC.petaFiles.on("regenerateProgress", (_, done, count) => {
    regeneratePetaFilesDone.value = done;
    regeneratePetaFilesCount.value = count;
    regenerateCompleted.value = false;
  });
  IPC.petaFiles.on("regenerateBegin", () => {
    regenerateCompleted.value = false;
  });
  IPC.petaFiles.on("regenerateComplete", () => {
    regenerateCompleted.value = true;
  });
});
function regeneratePetaFiles() {
  IPC.petaFiles.regenerate();
}
</script>

<style lang="scss" scoped></style>
<style lang="scss" scoped>
@import "@/renderer/components/settings/index.scss";
</style>
