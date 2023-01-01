<template>
  <t-settings-content-root>
    <label>
      <VCheckbox
        v-model:value="settingsStore.state.value.darkMode"
        :disabled="settingsStore.state.value.autoDarkMode" />
      {{ t("settings.darkMode") }}
    </label>
    <br />
    <label>
      <VCheckbox v-model:value="settingsStore.state.value.autoDarkMode" />
      {{ t("settings.autoDarkMode") }}
    </label>
    <p>{{ t("settings.autoDarkModeDescriptions") }}</p>
    <label>
      <VCheckbox v-model:value="settingsStore.state.value.alwaysOnTop" />
      {{ t("settings.alwaysOnTop") }}
    </label>
    <p>{{ t("settings.alwaysOnTopDescriptions") }}</p>
    <label>
      <VSelect
        v-model:value="settingsStore.state.value.show"
        :items="[
          { value: 'board', label: t('settings.showBoard') },
          { value: 'browser', label: t('settings.showBrowser') },
          { value: 'both', label: t('settings.showBoth') },
        ]" />
      <!-- <option value="board">{{ t("settings.showBoard") }}</option>
        <option value="browser">{{ t("settings.showBrowser") }}</option>
        <option value="both">{{ t("settings.showBoth") }}</option> -->
      {{ t("settings.show") }}
    </label>
    <p>{{ t("settings.showDescriptions") }}</p>
  </t-settings-content-root>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

import VCheckbox from "@/renderer/components/commons/utils/checkbox/VCheckbox.vue";
import VSelect from "@/renderer/components/commons/utils/select/VSelect.vue";

import { useSettingsStore } from "@/renderer/stores/settingsStore/useSettingsStore";

const settingsStore = useSettingsStore();
const { t } = useI18n();
</script>

<style lang="scss" scoped></style>
<style lang="scss" scoped>
@import "@/renderer/components/settings/index.scss";
</style>
