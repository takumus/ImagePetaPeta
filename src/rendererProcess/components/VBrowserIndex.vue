<template>
  <t-root
    :class="{
      dark: darkMode
    }"
  >
    <t-content>
      <t-top>
        <VTitleBar :isBrowser="true">
          <span>WOWOW</span>
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
import { BOARD_ADD_MULTIPLE_OFFSET_X, BOARD_ADD_MULTIPLE_OFFSET_Y, DEFAULT_BOARD_NAME, DEFAULT_IMAGE_SIZE, DOWNLOAD_URL, SAVE_DELAY } from "@/commons/defines";
import { dbPetaImagesToPetaImages, PetaImages } from "@/commons/datas/petaImage";
import { PetaBoard, createPetaBoard, dbPetaBoardsToPetaBoards, petaBoardsToDBPetaBoards } from "@/commons/datas/petaBoard";
import { PetaPanel, createPetaPanel } from "@/commons/datas/petaPanel";
import { UpdateMode } from "@/commons/api/interfaces/updateMode";
import { DelayUpdater } from "@/rendererProcess/utils/delayUpdater";
import { Vec2 } from "@/commons/utils/vec2";
import getNameAvoidDuplication from "@/rendererProcess/utils/getNameAvoidDuplication";
import { PetaTagInfo } from "@/commons/datas/petaTagInfo";
import { logChunk } from "@/rendererProcess/utils/rendererLogger";
import { minimId } from "@/commons/utils/utils";
import { StateSet } from "@/commons/datas/states";
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
  windowIsFocused = true;
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
    API.on("notifyUpdate", async (event, latest, downloaded) => {
      if (downloaded && await this.$components.dialog.show(
        this.$t("utils.installUpdateDialog", [this.$appInfo.version, latest]), [this.$t("shared.yes"), this.$t("shared.no")]
      ) == 0) {
        await API.send("installUpdate");
        API.send("openURL", `${DOWNLOAD_URL}${latest}`);
      } else if (!downloaded && await this.$components.dialog.show(
        this.$t("utils.downloadUpdateDialog", [this.$appInfo.version, latest]), [this.$t("shared.yes"), this.$t("shared.no")]
      ) == 0) {
        API.send("openURL", `${DOWNLOAD_URL}${latest}`);
      }
    });
    API.on("windowFocused", (e, focused) => {
      this.windowIsFocused = focused;
      if (!focused) {
        //
      }
    });
    this.windowIsFocused = await API.send("getWindowIsFocused");
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
  get uiVisible() {
    return this.$settings.autoHideUI ? this.windowIsFocused : true;
  }
}
</script>

<style lang="scss">
*, *:before, *:after {
  box-sizing: border-box;
}
body, html {
  overflow: hidden;
  width: 100%;
  height: 100%;
  user-select: none;
  margin: 0px;
  padding: 0px;
  font-size: 12px;
  font-family: "Helvetica Neue",
    Arial,
    "Hiragino Kaku Gothic ProN",
    "Hiragino Sans",
    Meiryo,
    sans-serif;
}
t-root {
  --rounded: 8px;
  & {
    --bg-color: #ffffff;
    --modal-bg-color: #00000070;
    --border-color: #999999;
    --font-color: #333333;
    --button-bg-color: #ffffff;
    --button-hover-bg-color: #e9e9e9;
    --button-active-bg-color: #dddddd;
    --tab-bg-color: #e9e9e9;
    --tab-selected-color: #ffffff;
    --tab-hovered-color: #f5f5f5;
    --tab-border-color: #cccccc;
    --window-buttons-hover: #cccccc;
    --window-buttons-close-hover: #ff0000;
    --contextmenu-item-color: #ffffff;
    --contextmenu-item-hover-color: #e9e9e9;
    --icon-filter: brightness(0.7) invert(100%);
  }
  &.dark {
    --bg-color: #141414;
    --modal-bg-color: #ffffff30;
    --border-color: #5c5c5c;
    --font-color: #d3d3d3;
    --button-bg-color: #141414;
    --button-hover-bg-color: #272727;
    --button-active-bg-color: #3f3f3f;
    --tab-bg-color: #272727;
    --tab-selected-color: #141414;
    --tab-hovered-color: #202020;
    --tab-border-color: #444444;
    --window-buttons-hover: #444444;
    --window-buttons-close-hover: #ff0000;
    --contextmenu-item-color: #272727;
    --contextmenu-item-hover-color: #444444;
    --icon-filter: unset;
  }
  background-color: var(--bg-color);
  color: var(--font-color);
  ::-webkit-scrollbar {
    width: 8px;
  }
  ::-webkit-scrollbar-thumb {
    background-color: #cccccc;
    border-radius: var(--rounded);
    min-height: 16px;
  }
  >.border {
    z-index: 10;
    position: fixed;
    width: 100%;
    height: 100%;
    // border: solid 1.5px var(--font-color);
    pointer-events: none;
  }
  button {
    display: inline-block;
    border-radius: var(--rounded);
    border: none;
    background-color: var(--button-bg-color);
    color: var(--font-color);
    padding: 4px 16px;
    height: 24px;
    line-height: 1.0em;
    font-size: 1.0em;
    cursor: pointer;
    // box-shadow: 0px 0px 2px rgba(0, 0, 0, 0.5);
    border: solid 1.2px var(--border-color);
    margin: 4px;
    outline: none;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    &:hover {
      background-color: var(--button-hover-bg-color);
      // box-shadow: 0px 0px 4px rgba(0, 0, 0, 0.5);
    }
    &:active {
      background-color: var(--button-active-bg-color);
      // box-shadow: inset 0px 0px 2px rgba(0, 0, 0, 0.5);
    }
  }
  >t-modals {
    position: absolute;
    width: 100%;
    height: 100%;
    top: 0px;
    left: 0px;
    z-index: 2;
  }
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
      background-color: var(--bg-color);
      flex: 1;
    }
  }
}
</style>