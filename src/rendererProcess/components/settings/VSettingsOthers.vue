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
      <input type="checkbox" v-model="settingsStore.state.value.developerMode" />
      {{ t("settings.developerMode") }}
    </label>
    <p>{{ t("settings.developerModeDescriptions") }}</p>
  </t-settings-content-root>
</template>

<script setup lang="ts">
// Others
import { useSettingsStore } from "@/rendererProcess/stores/settingsStore";
import { useI18n } from "vue-i18n";

const settingsStore = useSettingsStore();
const { t } = useI18n();
</script>

<style lang="scss" scoped></style>
<style lang="scss" scoped>
@import "@/rendererProcess/components/settings/index.scss";
</style>
