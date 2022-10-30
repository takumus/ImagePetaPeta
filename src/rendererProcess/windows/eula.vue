<template>
  <t-root
    :class="{
      dark: darkModeStore.state.value,
    }"
  >
    <t-content>
      <t-top>
        <VTitleBar :title="t('titles.eula')"> </VTitleBar>
      </t-top>
      <t-browser>
        <t-body>{{ t("eula.body") }}</t-body>
        <t-buttons v-if="needToAgree">
          <button @click="agree">{{ t("eula.agree") }}</button>
          <button @click="disagree">{{ t("eula.disagree") }}</button>
        </t-buttons>
        <t-buttons v-else>
          <button @click="close">{{ t("commons.closeButton") }}</button>
        </t-buttons>
      </t-browser>
    </t-content>
    <VDialog :zIndex="6"></VDialog>
    <VContextMenu :zIndex="4" />
  </t-root>
</template>

<script setup lang="ts">
// Vue
import { computed, onMounted, ref } from "vue";
// Components
import VTitleBar from "@/rendererProcess/components/top/VTitleBar.vue";
import VContextMenu from "@/rendererProcess/components/utils/VContextMenu.vue";
import VDialog from "@/rendererProcess/components/utils/VDialog.vue";
// Others
import { API } from "@/rendererProcess/api";
import { useAppInfoStore } from "@/rendererProcess/stores/appInfoStore";
import { useDarkModeStore } from "@/rendererProcess/stores/darkModeStore";
import { useI18n } from "vue-i18n";
import { useSettingsStore } from "../stores/settingsStore";
import { EULA } from "@/commons/defines";
const { t } = useI18n();
const appInfoStore = useAppInfoStore();
const darkModeStore = useDarkModeStore();
const settings = useSettingsStore();
const title = ref("");
onMounted(() => {
  title.value = `${t("titles.eula")} - ${appInfoStore.state.value.name} ${
    appInfoStore.state.value.version
  }`;
  document.title = title.value;
});
function agree() {
  API.send("eula", true);
}
function disagree() {
  API.send("eula", false);
}
function close() {
  API.send("windowClose");
}
const needToAgree = computed(() => {
  return settings.state.value.eula !== EULA;
});
</script>

<style lang="scss" scoped>
t-root {
  background-color: var(--color-main);
  color: var(--color-font);
  > t-content {
    position: fixed;
    top: 0px;
    left: 0px;
    display: flex;
    height: 100%;
    width: 100%;
    flex-direction: column;
    > t-top {
      display: block;
      width: 100%;
      z-index: 2;
    }
    > t-browser {
      display: block;
      overflow-y: auto;
      margin: var(--px2);
      background-color: var(--color-main);
      flex: 1;
      z-index: 1;
      > t-body {
        display: block;
        white-space: pre-wrap;
        user-select: text;
      }
      > t-buttons {
        display: block;
        text-align: center;
      }
    }
  }
}
</style>
<style lang="scss">
@import "@/rendererProcess/components/index.scss";
</style>
