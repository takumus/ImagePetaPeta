<template>
  <t-settings-root>
    <ul>
      <li
        v-for="tab in tabs"
        :key="tab"
        :class="{
          selected: currentTab === tab,
        }"
        @click="currentTab = tab"
      >
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
// Others
import { API } from "@/rendererProcess/api";
import { useI18n } from "vue-i18n";
import VSettingsGeneral from "@/rendererProcess/components/settings/VSettingsGeneral.vue";
import VSettingsDatas from "@/rendererProcess/components/settings/VSettingsDatas.vue";
import VSettingsOthers from "@/rendererProcess/components/settings/VSettingsOthers.vue";
import VSettingsUpdate from "@/rendererProcess/components/settings/VSettingsUpdate.vue";
import VSettingsInfo from "@/rendererProcess/components/settings/VSettingsInfo.vue";
import VSettingsControl from "@/rendererProcess/components/settings/VSettingsControl.vue";
import VSettingsBrowser from "@/rendererProcess/components/settings/VSettingsBrowser.vue";
const { t } = useI18n();
const tabNames = ["general", "control", "browser", "datas", "others", "update", "info"] as const;
const tabs = ref<typeof tabNames[number][]>([...tabNames]);
const currentTab = ref<typeof tabNames[number]>("general");
onMounted(async () => {
  API.on("foundLatestVersion", async () => {
    currentTab.value = "update";
  });
  const remoteBinaryInfo = await API.send("getLatestVersion");
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
      margin: 0px 8px;
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
