<template>
  <e-settings-content-root>
    <label>
      <VCheckbox v-model:value="settingsStore.state.value.alwaysShowNSFW" />
      {{ t("settings.alwaysShowNSFW") }}
    </label>
    <p>{{ t("settings.alwaysShowNSFWDescriptions") }}</p>
    <label>
      <VCheckbox v-model:value="settingsStore.state.value.showFPS" />
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
      <VCheckbox v-model:value="settingsStore.state.value.disableAcceleratedVideoDecode" />
      {{ t("settings.disableAcceleratedVideoDecode") }}
    </label>
    <p>{{ t("settings.disableAcceleratedVideoDecodeDescriptions") }}</p>
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
@use "@/renderer/components/settings/index.scss" as *;
</style>
