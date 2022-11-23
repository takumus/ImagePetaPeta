<template>
  <t-settings-root>
    <ul>
      <li
        v-for="tab in tabs"
        :key="tab"
        :class="{
          selected: currentTab === tab,
        }"
        @click="currentTab = tab">
        {{ t("settings." + tab) }}
      </li>
    </ul>
    <t-contents>
      <t-content v-if="currentTab === 'general'">
        <VSettingsGeneral />
      </t-content>
      <t-content v-if="currentTab === 'control'">
        <VSettingsControl />
      </t-content>
      <t-content v-if="currentTab === 'browser'">
        <VSettingsBrowser />
      </t-content>
      <t-content v-if="currentTab === 'datas'">
        <VSettingsDatas />
      </t-content>
      <t-content v-if="currentTab === 'others'">
        <VSettingsOthers />
      </t-content>
      <t-content v-if="currentTab === 'update'">
        <VSettingsUpdate />
      </t-content>
      <t-content v-if="currentTab === 'info'">
        <VSettingsInfo />
      </t-content>
    </t-contents>
  </t-settings-root>
</template>

<script setup lang="ts">
// Vue
import { onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";

import VSettingsBrowser from "@/renderer/components/settings/VSettingsBrowser.vue";
import VSettingsControl from "@/renderer/components/settings/VSettingsControl.vue";
import VSettingsDatas from "@/renderer/components/settings/VSettingsDatas.vue";
import VSettingsGeneral from "@/renderer/components/settings/VSettingsGeneral.vue";
import VSettingsInfo from "@/renderer/components/settings/VSettingsInfo.vue";
import VSettingsOthers from "@/renderer/components/settings/VSettingsOthers.vue";
import VSettingsUpdate from "@/renderer/components/settings/VSettingsUpdate.vue";

// Others
import { IPC } from "@/renderer/libs/ipc";

const { t } = useI18n();
const tabNames = ["general", "control", "browser", "datas", "others", "update", "info"] as const;
const tabs = ref<typeof tabNames[number][]>([...tabNames]);
const currentTab = ref<typeof tabNames[number]>("general");
onMounted(async () => {
  IPC.on("foundLatestVersion", async () => {
    currentTab.value = "update";
  });
  const remoteBinaryInfo = await IPC.send("getLatestVersion");
  if (!remoteBinaryInfo.isLatest) {
    currentTab.value = "update";
  }
});
</script>

<style lang="scss" scoped>
t-settings-root {
  text-align: center;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  > ul {
    list-style-type: none;
    padding: 0px;
    > li {
      margin: 0px var(--px-2);
      display: inline-block;
      cursor: pointer;
      &.selected {
        text-decoration: underline;
      }
    }
  }
  > t-contents {
    height: 100%;
    overflow-y: auto;
    overflow-x: hidden;
    display: block;
    > t-content {
      display: block;
    }
  }
}
</style>
