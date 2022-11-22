<template>
  <t-settings-content-root>
    <label>
      {{ t("settings.zoomSensitivity") }}:
      <input type="number" v-model="settingsStore.state.value.zoomSensitivity"
    /></label>
    <p>{{ t("settings.zoomSensitivityDescriptions") }}</p>
    <label>
      {{ t("settings.moveSensitivity") }}:
      <input type="number" v-model="settingsStore.state.value.moveSensitivity"
    /></label>
    <p>{{ t("settings.moveSensitivityDescriptions") }}</p>
  </t-settings-content-root>
</template>

<script setup lang="ts">
// Others
import { useI18n } from "vue-i18n";

import { useSettingsStore } from "@/renderer/stores/settingsStore/useSettingsStore";

const settingsStore = useSettingsStore();
const { t } = useI18n();
</script>

<style lang="scss" scoped></style>
<style lang="scss" scoped>
@import "@/renderer/components/settings/index.scss";
</style>
