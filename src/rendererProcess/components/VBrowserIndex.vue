<template>
  <t-root
    :class="{
      dark: darkMode
    }"
  >
    <t-content>
      <t-top>
        <VTitleBar :isBrowser="true">
        </VTitleBar>
      </t-top>
      <t-browser>
        <VBrowser
          :petaImages="petaImages"
          :petaTagInfos="petaTagInfos"
        />
      </t-browser>
    </t-content>
    <t-modals
      v-show="this.$components.modal.modalIds.length > 0"
    >
      <VInfo />
      <VSettings />
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
import VTabBar from "@/rendererProcess/components/top/VTabBar.vue";
import VTitleBar from "@/rendererProcess/components/top/VTitleBar.vue";
import VBoardProperty from "@/rendererProcess/components/top/VBoardProperty.vue";
import VContextMenu from "@/rendererProcess/components/utils/VContextMenu.vue";
import VComplement from "@/rendererProcess/components/utils/VComplement.vue";
import VInfo from "@/rendererProcess/components/info/VInfo.vue";
import VSettings from "@/rendererProcess/components/settings/VSettings.vue";
import VDialog from "@/rendererProcess/components/utils/VDialog.vue";
// Others
import { API } from "@/rendererProcess/api";
import { DOWNLOAD_URL } from "@/commons/defines";
import { dbPetaImagesToPetaImages, PetaImages } from "@/commons/datas/petaImage";
import { PetaTagInfo } from "@/commons/datas/petaTagInfo";
import { logChunk } from "@/rendererProcess/utils/rendererLogger";
@Options({
  components: {
    VBrowser,
    VImageImporter,
    VTasks,
    VTabBar,
    VBoardProperty,
    VTitleBar,
    VContextMenu,
    VComplement,
    VInfo,
    VSettings,
    VDialog
  },
})
export default class BrowserIndex extends Vue {
  petaImages: PetaImages = {};
  petaTagInfos: PetaTagInfo[] = [];
  title = "";
  async mounted() {
    window.onerror = (e) => {
      logChunk().log("vIndex", "window error:", e);
    }
    logChunk().log("vIndex", "INIT RENDERER!");
    API.on("updatePetaImages", (e) => {
      this.getPetaImages();
    });
    API.on("updatePetaTags", (e) => {
      this.getPetaTagInfos();
    });
    API.on("updatePetaImage", (e, petaImage) => {
      // log("vIndex", "on savePetaImage", petaImage.id);
      // this.petaImages[petaImage.id] = petaImage;
    });
    this.title = `${this.$appInfo.name} ${this.$appInfo.version}`;
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
  get darkMode() {
    if (this.$settings.autoDarkMode) {
      return this.$systemDarkMode.value;
    }
    return this.$settings.darkMode;
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
      overflow: hidden;
    }
    >t-browser {
      display: block;
      overflow: hidden;
      padding: 8px;
      background-color: var(--bg-color);
      flex: 1;
    }
  }
}
</style>
<style lang="scss">
@import "@/rendererProcess/components/index.scss";
</style>