<template>
  <t-settings-browser-root>
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
  </t-settings-browser-root>
</template>

<script setup lang="ts">
// Others
import { API } from "@/rendererProcess/api";
import { useSettingsStore } from "@/rendererProcess/stores/settingsStore";
import { onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";

const settingsStore = useSettingsStore();
const { t } = useI18n();
const regenerateMetadatasCompleted = ref(true);
const regenerateMetadatasDone = ref(0);
const regenerateMetadatasCount = ref(0);
onMounted(() => {
  API.on("regenerateMetadatasProgress", (_, done, count) => {
    regenerateMetadatasDone.value = done;
    regenerateMetadatasCount.value = count;
    regenerateMetadatasCompleted.value = false;
  });
  API.on("regenerateMetadatasBegin", () => {
    regenerateMetadatasCompleted.value = false;
  });
  API.on("regenerateMetadatasComplete", () => {
    regenerateMetadatasCompleted.value = true;
  });
});
function regenerateMetadatas() {
  API.send("regenerateMetadatas");
}
</script>

<style lang="scss" scoped>
t-settings-browser-root {
  text-align: left;
  display: block;
  > p {
    font-size: var(--size-0);
    margin-left: 16px;
    word-break: break-word;
  }
}
</style>
