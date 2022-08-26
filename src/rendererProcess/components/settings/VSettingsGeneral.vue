<template>
  <t-settings-content-root>
    <label>
      <input
        type="checkbox"
        v-model="settingsStore.state.value.darkMode"
        :disabled="settingsStore.state.value.autoDarkMode"
      />
      {{ t("settings.darkMode") }}
    </label>
    <br />
    <label>
      <input type="checkbox" v-model="settingsStore.state.value.autoDarkMode" />
      {{ t("settings.autoDarkMode") }}
    </label>
    <p>{{ t("settings.autoDarkModeDescriptions") }}</p>
    <label>
      <input type="checkbox" v-model="settingsStore.state.value.alwaysOnTop" />
      {{ t("settings.alwaysOnTop") }}
    </label>
    <p>{{ t("settings.alwaysOnTopDescriptions") }}</p>
    <label>
      <select v-model="settingsStore.state.value.show">
        <option value="board">{{ t("settings.showBoard") }}</option>
        <option value="browser">{{ t("settings.showBrowser") }}</option>
        <option value="both">{{ t("settings.showBoth") }}</option>
      </select>
      {{ t("settings.show") }}
    </label>
    <p>{{ t("settings.showDescriptions") }}</p>
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
