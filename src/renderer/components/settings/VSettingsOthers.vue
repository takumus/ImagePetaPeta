<template>
  <t-settings-content-root>
    <label>
      <input type="checkbox" v-model="settingsStore.state.value.alwaysShowNSFW" />
      {{ t("settings.alwaysShowNSFW") }}
    </label>
    <p>{{ t("settings.alwaysShowNSFWDescriptions") }}</p>
    <label>
      <input type="checkbox" v-model="settingsStore.state.value.showFPS" />
      {{ t("settings.showFPS") }}
    </label>
    <p>{{ t("settings.showFPSDescriptions") }}</p>
    <label>
      {{ t("settings.gamutMapSampling") }}:<input
        type="number"
        v-model="settingsStore.state.value.gamutMapSampling"
        min="100"
        max="65536" />
    </label>
    <p>{{ t("settings.gamutMapSamplingDescriptions") }}</p>
    <label>
      <input type="checkbox" v-model="settingsStore.state.value.developerMode" />
      {{ t("settings.developerMode") }}
    </label>
    <p>{{ t("settings.developerModeDescriptions") }}</p>
  </t-settings-content-root>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

import { useSettingsStore } from "@/renderer/stores/settingsStore/useSettingsStore";

const settingsStore = useSettingsStore();
const { t } = useI18n();
</script>

<style lang="scss" scoped></style>
<style lang="scss" scoped>
@import "@/renderer/components/settings/index.scss";
</style>
