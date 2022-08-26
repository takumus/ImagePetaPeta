<template>
  <t-root
    :class="{
      dark: darkModeStore.state.value,
    }"
  >
    <t-content>
      <t-top>
        <VTitleBar :title="t('titles.browser')"> </VTitleBar>
        <VUtilsBar> </VUtilsBar>
      </t-top>
      <t-browser>
        <VBrowser :petaTagInfos="petaTagInfos" />
      </t-browser>
    </t-content>
    <t-modals v-show="components.modal.modalIds.length > 0">
      <VImageImporter />
      <VTasks />
    </t-modals>
    <VDialog :zIndex="6"></VDialog>
    <VContextMenu :zIndex="4" />
  </t-root>
</template>

<script setup lang="ts">
// Vue
import { nextTick, onMounted, ref } from "vue";
// Components
import VBrowser from "@/rendererProcess/components/browser/VBrowser.vue";
import VImageImporter from "@/rendererProcess/components/importer/VImageImporter.vue";
import VTasks from "@/rendererProcess/components/task/VTasks.vue";
import VTitleBar from "@/rendererProcess/components/top/VTitleBar.vue";
import VUtilsBar from "@/rendererProcess/components/top/VUtilsBar.vue";
import VContextMenu from "@/rendererProcess/components/utils/VContextMenu.vue";
import VDialog from "@/rendererProcess/components/utils/VDialog.vue";
// Others
import { API } from "@/rendererProcess/api";
import { PetaTagInfo } from "@/commons/datas/petaTagInfo";
import { useAppInfoStore } from "@/rendererProcess/stores/appInfoStore";
import { useDarkModeStore } from "@/rendererProcess/stores/darkModeStore";
import { useI18n } from "vue-i18n";
import { useComponentsStore } from "@/rendererProcess/stores/componentsStore";
const appInfoStore = useAppInfoStore();
const components = useComponentsStore();
const { t } = useI18n();
const darkModeStore = useDarkModeStore();
const petaTagInfos = ref<PetaTagInfo[]>([]);
const title = ref("");
onMounted(async () => {
  API.on("updatePetaTags", () => {
    getPetaTagInfos();
  });
  title.value = `${t("titles.browser")} - ${appInfoStore.state.value.name} ${appInfoStore.state.value.version}`;
  document.title = title.value;
  await getPetaTagInfos();
  nextTick(() => {
    API.send("showMainWindow");
  });
});
async function getPetaTagInfos() {
  petaTagInfos.value = await API.send("getPetaTagInfos");
}
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
      padding: 8px;
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
