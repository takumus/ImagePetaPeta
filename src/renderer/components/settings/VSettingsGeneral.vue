<template>
  <e-settings-content-root>
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
    <e-label class="label">
      <VSelect
        v-model:value="settingsStore.state.value.show"
        :items="[
          { value: 'board', label: t('settings.showBoard') },
          { value: 'browser', label: t('settings.showBrowser') },
          { value: 'both', label: t('settings.showBoth') },
        ]" />
      {{ t("settings.show") }}
    </e-label>
    <p>{{ t("settings.showDescriptions") }}</p>
  </e-settings-content-root>
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
@use "@/renderer/components/settings/index.scss" as *;
</style>
