<template>
  <e-settings-content-root>
    <button v-show="regenerateMetadatasCompleted" @click="regenerateMetadatas">
      {{ t("settings.regenerateMetadatasButton") }}
    </button>
    <label v-show="!regenerateMetadatasCompleted">
      {{ regenerateMetadatasDone }}/{{ regenerateMetadatasCount }}
    </label>
    <p>{{ t("settings.regenerateMetadatasDescriptions") }}</p>
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
const regenerateMetadatasCompleted = ref(true);
const regenerateMetadatasDone = ref(0);
const regenerateMetadatasCount = ref(0);
onMounted(() => {
  IPC.on("regenerateMetadatasProgress", (_, done, count) => {
    regenerateMetadatasDone.value = done;
    regenerateMetadatasCount.value = count;
    regenerateMetadatasCompleted.value = false;
  });
  IPC.on("regenerateMetadatasBegin", () => {
    regenerateMetadatasCompleted.value = false;
  });
  IPC.on("regenerateMetadatasComplete", () => {
    regenerateMetadatasCompleted.value = true;
  });
});
function regenerateMetadatas() {
  IPC.regenerateMetadatas();
}
</script>

<style lang="scss" scoped></style>
<style lang="scss" scoped>
@import "@/renderer/components/settings/index.scss";
</style>
