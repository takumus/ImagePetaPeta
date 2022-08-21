<template>
  <t-root
    :class="{
      dark: darkModeStore.state.value,
    }"
  >
    <t-content>
      <t-top>
        <VTitleBar :title="$t('titles.settings')"> </VTitleBar>
      </t-top>
      <t-browser>
        <VSettings />
      </t-browser>
    </t-content>
    <VDialog :zIndex="6"></VDialog>
    <VContextMenu :zIndex="4" />
    <VComplement :zIndex="5" />
  </t-root>
</template>

<script setup lang="ts">
// Vue
import { getCurrentInstance, onMounted, ref } from "vue";
// Components
import VTitleBar from "@/rendererProcess/components/top/VTitleBar.vue";
import VContextMenu from "@/rendererProcess/components/utils/VContextMenu.vue";
import VComplement from "@/rendererProcess/components/utils/VComplement.vue";
import VSettings from "@/rendererProcess/components/settings/VSettings.vue";
import VDialog from "@/rendererProcess/components/utils/VDialog.vue";
// Others
import { API } from "@/rendererProcess/api";
import { useKeyboardsStore } from "@/rendererProcess/stores/keyboardsStore";
import { useAppInfoStore } from "@/rendererProcess/stores/appInfoStore";
import { useDarkModeStore } from "@/rendererProcess/stores/darkModeStore";
const _this = getCurrentInstance()!.proxy!;
const appInfoStore = useAppInfoStore();
const darkModeStore = useDarkModeStore();
const title = ref("");
const keyboards = useKeyboardsStore();
onMounted(() => {
  title.value = `${_this.$t("titles.settings")} - ${appInfoStore.state.value.name} ${appInfoStore.state.value.version}`;
  document.title = title.value;
  keyboards.enabled = true;
  keyboards.keys("Escape").up(() => {
    API.send("windowClose");
  });
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
      overflow: hidden;
      padding: 16px;
      background-color: var(--color-main);
      flex: 1;
      z-index: 1;
    }
    > t-modals {
      position: absolute;
      width: 100%;
      height: 100%;
      top: 0px;
      left: 0px;
      z-index: 3;
    }
  }
}
</style>
<style lang="scss">
@import "@/rendererProcess/components/index.scss";
</style>
