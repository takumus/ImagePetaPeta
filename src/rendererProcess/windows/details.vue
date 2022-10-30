<template>
  <t-root
    :class="{
      dark: darkModeStore.state.value,
    }"
  >
    <t-content>
      <t-top>
        <VTitleBar :title="t('titles.details')"> </VTitleBar>
        <VUtilsBar> </VUtilsBar>
      </t-top>
      <t-browser>
        <t-board v-if="petaImage">
          <VDetails :petaImage="petaImage" :zIndex="1" />
        </t-board>
        <t-property>
          <VProperty :petaImages="singlePetaImages" @selectTag="() => {}" />
        </t-property>
      </t-browser>
    </t-content>
    <t-modals v-show="components.modal.modalIds.length > 0">
      <VTasks />
    </t-modals>
    <VDialog :zIndex="6"></VDialog>
    <VContextMenu :zIndex="4" />
  </t-root>
</template>

<script setup lang="ts">
// Vue
import { computed, nextTick, onMounted, ref, watch } from "vue";
// Components
import VTasks from "@/rendererProcess/components/task/VTasks.vue";
import VTitleBar from "@/rendererProcess/components/top/VTitleBar.vue";
import VUtilsBar from "@/rendererProcess/components/top/VUtilsBar.vue";
import VContextMenu from "@/rendererProcess/components/utils/VContextMenu.vue";
import VDialog from "@/rendererProcess/components/utils/VDialog.vue";
import VBoard from "@/rendererProcess/components/board/VBoard.vue";
import VProperty from "@/rendererProcess/components/browser/property/VProperty.vue";
// Others
import { AnimatedGIFLoader } from "@/rendererProcess/utils/pixi-gif";
import { API } from "@/rendererProcess/api";
import { UpdateMode } from "@/commons/api/interfaces/updateMode";
import { PetaBoard } from "@/commons/datas/petaBoard";
import { Vec2 } from "@/commons/utils/vec2";
import {
  BOARD_DARK_BACKGROUND_FILL_COLOR,
  BOARD_DARK_BACKGROUND_LINE_COLOR,
} from "@/commons/defines";
import { PetaPanel } from "@/commons/datas/petaPanel";
import { Keyboards } from "@/rendererProcess/utils/keyboards";
import { useAppInfoStore } from "@/rendererProcess/stores/appInfoStore";
import { useDarkModeStore } from "@/rendererProcess/stores/darkModeStore";
import { useI18n } from "vue-i18n";
import { useComponentsStore } from "@/rendererProcess/stores/componentsStore";
import { usePetaImagesStore } from "@/rendererProcess/stores/petaImagesStore";
import { usePetaTagsStore } from "@/rendererProcess/stores/petaTagsStore";
import VDetails from "@/rendererProcess/components/details/VDetails.vue";
const appInfoStore = useAppInfoStore();
const components = useComponentsStore();
const { t } = useI18n();
const darkModeStore = useDarkModeStore();
const petaImagesStore = usePetaImagesStore();
const petaTagsStore = usePetaTagsStore();
const vPetaBoard = ref<InstanceType<typeof VBoard>>();
const board = ref<PetaBoard>();
const title = ref("");
const petaImageId = ref<string>();
const keyboards = new Keyboards();
onMounted(async () => {
  AnimatedGIFLoader.add?.();
  petaImagesStore.onUpdate(async (newPetaImages, mode) => {
    if (mode === UpdateMode.UPDATE) {
      vPetaBoard.value?.orderPIXIRender();
    } else if (mode === UpdateMode.REMOVE) {
      newPetaImages.forEach((petaImage) => {
        if (!board.value) {
          return;
        }
        Object.values(board.value.petaPanels).forEach((petaPanel) => {
          if (petaPanel.petaImageId === petaImage.id) {
            API.send("windowClose");
          }
        });
      });
    }
  });
  API.on("detailsPetaImage", (event, petaImage) => {
    petaImageId.value = petaImage.id;
  });
  petaImageId.value = (await API.send("getDetailsPetaImage"))?.id;
  title.value = `${t("titles.details")} - ${appInfoStore.state.value.name} ${
    appInfoStore.state.value.version
  }`;
  document.title = title.value;
  nextTick(() => {
    API.send("showMainWindow");
  });
  keyboards.enabled = true;
  keyboards.keys("Escape").up(() => {
    API.send("windowClose");
  });
});
const petaImage = computed(() => {
  return petaImagesStore.getPetaImage(petaImageId.value);
});
const singlePetaImages = computed(() => {
  if (petaImage.value === undefined) {
    return [];
  }
  return [petaImage.value];
});
watch(petaImage, () => {
  if (petaImage.value === undefined) {
    board.value = undefined;
    return;
  }
  const width = 256;
  const panel: PetaPanel = {
    petaImageId: petaImage.value.id,
    position: new Vec2(),
    rotation: 0,
    width: width,
    height: (petaImage.value.height / petaImage.value.width) * width,
    crop: {
      position: new Vec2(0, 0),
      width: 1,
      height: 1,
    },
    id: "petaImage",
    index: 0,
    gif: {
      stopped: false,
      frame: 0,
    },
    visible: true,
    locked: true,
  };
  board.value = {
    petaPanels: { [panel.id]: panel },
    id: "details",
    name: "details",
    transform: {
      scale: 1,
      position: new Vec2(0, 0),
    },
    background: {
      fillColor: BOARD_DARK_BACKGROUND_FILL_COLOR,
      lineColor: BOARD_DARK_BACKGROUND_LINE_COLOR,
    },
    index: 0,
  };
  vPetaBoard.value?.load({});
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
      display: flex;
      overflow: hidden;
      background-color: var(--color-main);
      flex: 1;
      z-index: 1;
      > t-board {
        display: block;
        flex: 1;
        z-index: 1;
        overflow: hidden;
        background-repeat: repeat;
        background-image: url("~@/@assets/transparentBackground.png");
        cursor: grab;
      }
      > t-property {
        padding: var(--px1);
        display: block;
        background-color: var(--color-main);
        z-index: 2;
        width: 300px;
      }
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
