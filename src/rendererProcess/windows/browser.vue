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
        <VBrowser :petaImages="petaImages" :petaTagInfos="petaTagInfos" />
      </t-browser>
    </t-content>
    <t-modals v-show="$components.modal.modalIds.length > 0">
      <VImageImporter />
      <VTasks />
    </t-modals>
    <VDialog :zIndex="6"></VDialog>
    <VContextMenu :zIndex="4" />
    <VComplement :zIndex="5" />
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
import VComplement from "@/rendererProcess/components/utils/VComplement.vue";
import VDialog from "@/rendererProcess/components/utils/VDialog.vue";
// Others
import { API } from "@/rendererProcess/api";
import { dbPetaImagesToPetaImages, dbPetaImageToPetaImage, PetaImages } from "@/commons/datas/petaImage";
import { PetaTagInfo } from "@/commons/datas/petaTagInfo";
import { UpdateMode } from "@/commons/api/interfaces/updateMode";
import { useAppInfoStore } from "@/rendererProcess/stores/appInfoStore";
import { useDarkModeStore } from "@/rendererProcess/stores/darkModeStore";
import { useI18n } from "vue-i18n";
const appInfoStore = useAppInfoStore();
const { t } = useI18n();
const darkModeStore = useDarkModeStore();
const petaImages = ref<PetaImages>({});
const petaTagInfos = ref<PetaTagInfo[]>([]);
const title = ref("");
onMounted(async () => {
  API.on("updatePetaImages", (e, newPetaImages, mode) => {
    if (mode === UpdateMode.UPSERT || mode === UpdateMode.UPDATE) {
      newPetaImages.forEach((petaImage) => {
        petaImages.value[petaImage.id] = dbPetaImageToPetaImage(
          petaImage,
          Boolean(petaImages.value[petaImage.id]?._selected),
        );
      });
    } else if (mode === UpdateMode.REMOVE) {
      newPetaImages.forEach((petaImage) => {
        delete petaImages.value[petaImage.id];
      });
    }
  });
  API.on("updatePetaTags", () => {
    getPetaTagInfos();
  });
  title.value = `${t("titles.browser")} - ${appInfoStore.state.value.name} ${appInfoStore.state.value.version}`;
  document.title = title.value;
  await getPetaImages();
  await getPetaTagInfos();
  nextTick(() => {
    API.send("showMainWindow");
  });
});
async function getPetaImages() {
  petaImages.value = dbPetaImagesToPetaImages(await API.send("getPetaImages"), false);
  // this.addOrderedPetaPanels();
}
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
