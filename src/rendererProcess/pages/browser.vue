<template>
  <t-root
    :class="{
      dark: $darkMode.value
    }"
  >
    <t-content>
      <t-top>
        <VTitleBar :title="$t('titles.browser')">
        </VTitleBar>
        <VUtilsBar>
        </VUtilsBar>
      </t-top>
      <t-browser>
        <VBrowser
          :petaImages="petaImages"
          :petaTagInfos="petaTagInfos"
          :selectedPetaTags="selectedPetaTags"
        />
      </t-browser>
    </t-content>
    <t-modals
      v-show="$components.modal.modalIds.length > 0"
    >
      <VImageImporter />
      <VTasks />
    </t-modals>
    <VDialog
      :zIndex="6"
    ></VDialog>
    <VContextMenu
      :zIndex="4"
    />
    <VComplement
      :zIndex="5"
    />
  </t-root>
</template>

<script lang="ts">
// Vue
import { Options, Vue } from "vue-class-component";
import { Ref, Watch } from "vue-property-decorator";
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
import { logChunk } from "@/rendererProcess/utils/rendererLogger";
import { PetaTag } from "@/commons/datas/petaTag";
import { UpdateMode } from "@/commons/api/interfaces/updateMode";
@Options({
  components: {
    VBrowser,
    VImageImporter,
    VTasks,
    VTitleBar,
    VContextMenu,
    VComplement,
    VDialog,
    VUtilsBar
  },
})
export default class BrowserIndex extends Vue {
  petaImages: PetaImages = {};
  petaTagInfos: PetaTagInfo[] = [];
  selectedPetaTags: PetaTag[] = [];
  title = "";
  async mounted() {
    API.on("updatePetaImages", (e, petaImages, mode) => {
      if (mode === UpdateMode.UPSERT || mode === UpdateMode.UPDATE) {
        petaImages.forEach((petaImage) => {
          this.petaImages[petaImage.id] = dbPetaImageToPetaImage(petaImage, Boolean(this.petaImages[petaImage.id]?._selected));
        });
      } else if (mode === UpdateMode.REMOVE) {
        petaImages.forEach((petaImage) => {
          delete this.petaImages[petaImage.id];
        });
      }
    });
    API.on("updatePetaTags", (e) => {
      this.getPetaTagInfos();
    });
    this.title = `${this.$t("titles.browser")} - ${this.$appInfo.name} ${this.$appInfo.version}`;
    document.title = this.title;
    await this.getPetaImages();
    await this.getPetaTagInfos();
    this.$nextTick(() => {
      API.send("showMainWindow");
    });
  }
  async getPetaImages() {
    this.petaImages = dbPetaImagesToPetaImages(await API.send("getPetaImages"), false);
    // this.addOrderedPetaPanels();
  }
  async getPetaTagInfos() {
    this.petaTagInfos = await API.send("getPetaTagInfos");
  }
  @Watch("$focusedWindows.focused")
  changeWindowIsFocused() {
    // console.log(this.$focusedWindows.focused);
  }
}
</script>

<style lang="scss" scoped>
t-root {
  >t-content {
    position: fixed;
    top: 0px;
    left: 0px;
    display: flex;
    height: 100%;
    width: 100%;
    flex-direction: column;
    >t-top {
      display: block;
      width: 100%;
      z-index: 2;
    }
    >t-browser {
      display: block;
      overflow: hidden;
      padding: 8px;
      background-color: var(--bg-color);
      flex: 1;
      z-index: 1;
    }
    >t-modals {
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