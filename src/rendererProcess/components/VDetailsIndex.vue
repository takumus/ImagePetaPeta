<template>
  <t-root
    :class="{
      dark: darkMode
    }"
  >
    <t-content>
      <t-top>
        <VTitleBar>
        </VTitleBar>
        <!-- <VUtilsBar>
        </VUtilsBar> -->
      </t-top>
      <t-browser>
        <VBoard
          :zIndex="1"
          :board="board"
          :detailsMode="true"
          ref="vPetaBoard"
        />
      </t-browser>
    </t-content>
    <t-modals
      v-show="this.$components.modal.modalIds.length > 0"
    >
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
import VTasks from "@/rendererProcess/components/task/VTasks.vue";
import VTitleBar from "@/rendererProcess/components/top/VTitleBar.vue";
import VUtilsBar from "@/rendererProcess/components/top/VUtilsBar.vue";
import VContextMenu from "@/rendererProcess/components/utils/VContextMenu.vue";
import VComplement from "@/rendererProcess/components/utils/VComplement.vue";
import VDialog from "@/rendererProcess/components/utils/VDialog.vue";
import VBoard from "@/rendererProcess/components/board/VBoard.vue";
// Others
import { API } from "@/rendererProcess/api";
import { dbPetaImagesToPetaImages, dbPetaImageToPetaImage, PetaImage, PetaImages } from "@/commons/datas/petaImage";
import { PetaTagInfo } from "@/commons/datas/petaTagInfo";
import { logChunk } from "@/rendererProcess/utils/rendererLogger";
import { PetaTag } from "@/commons/datas/petaTag";
import { UpdateMode } from "@/commons/api/interfaces/updateMode";
import { getImageURL } from "../utils/imageURL";
import { ImageType } from "@/commons/datas/imageType";
import { PetaBoard } from "@/commons/datas/petaBoard";
import { Vec2 } from "@/commons/utils/vec2";
import { BOARD_DARK_BACKGROUND_FILL_COLOR, BOARD_DARK_BACKGROUND_LINE_COLOR } from "@/commons/defines";
import { PetaPanel } from "@/commons/datas/petaPanel";
@Options({
  components: {
    VTasks,
    VTitleBar,
    VContextMenu,
    VComplement,
    VDialog,
    VUtilsBar,
    VBoard
  },
})
export default class DetailsIndex extends Vue {
  @Ref("vPetaBoard")
  vPetaBoard!: VBoard;
  board: PetaBoard | null = null;
  petaImages: PetaImages = {};
  petaTagInfos: PetaTagInfo[] = [];
  selectedPetaTags: PetaTag[] = [];
  title = "";
  petaImageId? = "";
  async mounted() {
    API.on("updatePetaImages", async (e, petaImages, mode) => {
      if (mode === UpdateMode.UPSERT) {
        petaImages.forEach((petaImage) => {
          this.petaImages[petaImage.id] = dbPetaImageToPetaImage(petaImage);
          this.board?.petaPanels.forEach((petaPanel) => {
            if (petaPanel.petaImageId === petaImage.id) {
              petaPanel._petaImage = this.petaImages[petaImage.id];
              this.vPetaBoard.load();
            }
          });
        });
      } else if (mode === UpdateMode.UPDATE) {
        petaImages.forEach((newPetaImage) => {
          const petaImage = this.petaImages[newPetaImage.id];
          if (petaImage) {
            Object.assign(petaImage, dbPetaImageToPetaImage(newPetaImage));
          }
        });
        this.vPetaBoard.orderPIXIRender();
      } else if (mode === UpdateMode.REMOVE) {
        petaImages.forEach((petaImage) => {
          delete this.petaImages[petaImage.id];
          this.board?.petaPanels.forEach((petaPanel) => {
            if (petaPanel.petaImageId === petaImage.id) {
              petaPanel._petaImage = undefined;
              this.vPetaBoard.load();
            }
          });
        });
      }
    });
    API.on("updatePetaTags", (e) => {
      this.getPetaTagInfos();
    });
    API.on("detailsPetaImage", (event, petaImage) => {
      this.petaImageId = petaImage.id;
    });
    this.petaImageId = (await API.send("getDetailsPetaImage"))?.id;
    this.title = `${this.$appInfo.name} ${this.$appInfo.version}`;
    document.title = this.title;
    await this.getPetaImages();
    await this.getPetaTagInfos();
    this.$nextTick(() => {
      API.send("showMainWindow");
    });
  }
  get petaImage() {
    if (this.petaImageId === undefined) {
      return undefined;
    }
    return this.petaImages[this.petaImageId];
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
  get petaImageURL() {
    return getImageURL(this.petaImage, ImageType.ORIGINAL);
  }
  @Watch("petaImage")
  changePetaImage() {
    if (this.petaImage === undefined) {
      this.board = null;
      return;
    }
    const width = 256;
    const panel: PetaPanel = {
      petaImageId: this.petaImage.id,
      position: new Vec2(),
      rotation: 0,
      width: width,
      height: this.petaImage.height * width,
      crop: {
        position: new Vec2(0, 0),
        width: 1,
        height: 1
      },
      id: "petaImage",
      index: 0,
      gif: {
        stopped: false,
        frame: 0
      },
      visible: true,
      locked: true,
      _petaImage: this.petaImage
    }
    this.board = {
      petaPanels: [panel],
      id: "details",
      name: "details",
      transform: {
        scale: 1,
        position: new Vec2(0, 0)
      },
      background: {
        fillColor: BOARD_DARK_BACKGROUND_FILL_COLOR,
        lineColor: BOARD_DARK_BACKGROUND_LINE_COLOR,
      },
      index: 0
    }
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