<template>
  <t-settings-content-root>
    <button v-show="regenerateMetadatasCompleted" @click="regenerateMetadatas">
      {{ t("settings.regenerateMetadatasButton") }}
    </button>
    <label v-show="!regenerateMetadatasCompleted">
      {{ regenerateMetadatasDone }}/{{ regenerateMetadatasCount }}
    </label>
    <p>{{ t("settings.regenerateMetadatasDescriptions") }}</p>
    <label>
      <input type="checkbox" v-model="settingsStore.state.value.loadTilesInOriginal" />
      {{ t("settings.loadTilesInOriginal") }}
    </label>
    <p>{{ t("settings.loadTilesInOriginalDescriptions") }}</p>
    <label>
      <input type="checkbox" v-model="settingsStore.state.value.showTagsOnTile" />
      {{ t("settings.showTagsOnTile") }}
    </label>
    <p>{{ t("settings.showTagsOnTileDescriptions") }}</p>
  </t-settings-content-root>
</template>

<script setup lang="ts">
// Others
import { onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";

import { IPC } from "@/renderer/ipc";
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
  IPC.send("regenerateMetadatas");
}
</script>

<style lang="scss" scoped></style>
<style lang="scss" scoped>
@import "@/renderer/components/settings/index.scss";
</style>
