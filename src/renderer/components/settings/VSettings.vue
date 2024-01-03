<template>
  <e-settings-root>
    <e-categories>
      <e-category
        v-for="tab in tabs"
        :key="tab"
        :class="{
          selected: currentTab === tab,
        }"
        @click="currentTab = tab">
        {{ t("settings." + tab) }}
      </e-category>
    </e-categories>
    <e-contents>
      <e-content v-if="currentTab === 'general'">
        <VSettingsGeneral />
      </e-content>
      <e-content v-if="currentTab === 'control'">
        <VSettingsControl />
      </e-content>
      <e-content v-if="currentTab === 'browser'">
        <VSettingsBrowser />
      </e-content>
      <e-content v-if="currentTab === 'datas'">
        <VSettingsDatas />
      </e-content>
      <e-content v-if="currentTab === 'others'">
        <VSettingsOthers />
      </e-content>
      <e-content v-if="currentTab === 'web'">
        <VSettingsWeb />
      </e-content>
      <e-content v-if="currentTab === 'update'">
        <VSettingsUpdate />
      </e-content>
      <e-content v-if="currentTab === 'info'">
        <VSettingsInfo />
      </e-content>
    </e-contents>
  </e-settings-root>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";

import VSettingsBrowser from "@/renderer/components/settings/VSettingsBrowser.vue";
import VSettingsControl from "@/renderer/components/settings/VSettingsControl.vue";
import VSettingsDatas from "@/renderer/components/settings/VSettingsDatas.vue";
import VSettingsGeneral from "@/renderer/components/settings/VSettingsGeneral.vue";
import VSettingsInfo from "@/renderer/components/settings/VSettingsInfo.vue";
import VSettingsOthers from "@/renderer/components/settings/VSettingsOthers.vue";
import VSettingsUpdate from "@/renderer/components/settings/VSettingsUpdate.vue";
import VSettingsWeb from "@/renderer/components/settings/VSettingsWeb.vue";

import { IPC } from "@/renderer/libs/ipc";

const { t } = useI18n();
const tabNames = [
  "general",
  "control",
  "browser",
  "datas",
  "web",
  "others",
  "update",
  "info",
] as const;
const tabs = ref<(typeof tabNames)[number][]>([...tabNames]);
const currentTab = ref<(typeof tabNames)[number]>("general");
onMounted(async () => {
  IPC.on("foundLatestVersion", async () => {
    currentTab.value = "update";
  });
  const remoteBinaryInfo = await IPC.getLatestVersion();
  if (!remoteBinaryInfo.isLatest) {
    currentTab.value = "update";
  }
});
</script>

<style lang="scss" scoped>
e-settings-root {
  display: flex;
  flex-direction: row;
  height: 100%;
  overflow: hidden;
  > e-categories {
    padding: 0px;
    > e-category {
      display: block;
      cursor: pointer;
      margin: var(--px-2);
      &.selected {
        text-decoration: underline;
      }
    }
  }
  > e-contents {
    display: block;
    flex: 1;
    height: 100%;
    overflow-x: hidden;
    overflow-y: auto;
    > e-content {
      display: block;
    }
  }
}
</style>
