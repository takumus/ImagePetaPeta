<template>
  <e-settings-content-root>
    <label>
      <VCheckbox v-model:value="settingsStore.state.value.web" />
      {{ t("settings.web") }}
    </label>
    <p>{{ t("settings.webDescriptions", [WEBHOOK_PORT]) }}</p>
  </e-settings-content-root>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

import VCheckbox from "@/renderer/components/commons/utils/checkbox/VCheckbox.vue";

import { WEBHOOK_PORT } from "@/commons/defines";

import { useSettingsStore } from "@/renderer/stores/settingsStore/useSettingsStore";

const settingsStore = useSettingsStore();
const { t } = useI18n();
</script>

<style lang="scss" scoped></style>
<style lang="scss" scoped>
@import "@/renderer/components/settings/index.scss";
</style>
