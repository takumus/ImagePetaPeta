<template>
  <t-settings-others-root>
    <label>
      <input type="checkbox" v-model="settingsStore.state.value.alwaysShowNSFW" />
      {{ t("settings.alwaysShowNSFW") }} </label
    ><br />
    <p>{{ t("settings.alwaysShowNSFWDescriptions") }}</p>
    <label>
      <input type="checkbox" v-model="settingsStore.state.value.showFPS" />
      {{ t("settings.showFPS") }} </label
    ><br />
    <p>{{ t("settings.showFPSDescriptions") }}</p>
  </t-settings-others-root>
</template>

<script setup lang="ts">
// Others
import { useSettingsStore } from "@/rendererProcess/stores/settingsStore";
import { useI18n } from "vue-i18n";

const settingsStore = useSettingsStore();
const { t } = useI18n();
</script>

<style lang="scss" scoped>
t-settings-others-root {
  text-align: left;
  display: block;
  > p {
    font-size: var(--size-0);
    margin-left: 16px;
    word-break: break-word;
  }
}
</style>
