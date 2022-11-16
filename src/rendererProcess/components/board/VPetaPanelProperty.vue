<template>
  <VFloating
    :visible="show"
    :zIndex="zIndex"
    :maxWidth="'512px'"
    :maxHeight="'unset'"
    ref="floating"
  >
    <t-content>
      <p v-for="p in selectedPetaPanels" :key="p.id">{{ p.id }}</p>
      <button @click="changeOrder('front')">{{ t("boards.panelMenu.toFront") }}</button>
      <button @click="changeOrder('back')">{{ t("boards.panelMenu.toBack") }}</button>
      <button @click="flipPetaPanel('horizontal')">
        {{ t("boards.panelMenu.flipHorizontal") }}
      </button>
      <button @click="flipPetaPanel('vertical')">{{ t("boards.panelMenu.flipVertical") }}</button>
      <button @click="resetPetaPanel()">{{ t("boards.panelMenu.reset") }}</button>
      <button @click="removeSelectedPanels()">{{ t("boards.panelMenu.remove") }}</button>
    </t-content>
  </VFloating>
</template>

<script setup lang="ts">
// Vue
import { ref, onMounted } from "vue";

// Others
import VFloating from "@/rendererProcess/components/utils/VFloating.vue";
import { PetaPanel } from "@/commons/datas/petaPanel";
import { Vec2 } from "@/commons/utils/vec2";
import { searchParentElement } from "@/rendererProcess/utils/searchParentElement";
import { useI18n } from "vue-i18n";
const props = defineProps<{
  zIndex: number;
  selectedPetaPanels: PetaPanel[];
  petaPanels: PetaPanel[];
}>();
const emit = defineEmits<{
  (e: "update:petaPanels", updates: PetaPanel[]): void;
  (e: "sortIndex"): void;
  (e: "removeSelectedPanels"): void;
}>();
const { t } = useI18n();
const show = ref(false);
const floating = ref<InstanceType<typeof VFloating>>();
onMounted(() => {
  window.addEventListener("pointerdown", (event) => {
    if (
      event.target instanceof HTMLElement &&
      !searchParentElement(event.target, floating.value?.rootElement) &&
      show.value
    ) {
      close();
      console.log("close");
    }
  });
});
function open(position: Vec2): void {
  show.value = true;
  floating.value?.updateFloating({ ...position, width: 0, height: 0 });
  // const petaImage = petaImagesStore.getPetaImage(petaPanel.petaImageId);
  // const isMultiple = selectedPPanels().length > 1;
  // components.contextMenu.open(
  //   [
  //     { label: t("boards.panelMenu.toFront"), click: () => changeOrder("front") },
  //     { label: t("boards.panelMenu.toBack"), click: () => changeOrder("back") },
  //     { separate: true },
  //     { label: t("boards.panelMenu.details"), click: () => openDetails(petaImage) },
  //     { separate: true },
  //     {
  //       skip: isMultiple || !pPanel.isGIF,
  //       label: pPanel.isPlayingGIF ? t("boards.panelMenu.stopGIF") : t("boards.panelMenu.playGIF"),
  //       click: () => {
  //         pPanel.toggleGIF();
  //         updatePetaBoard();
  //       },
  //     },
  //     { skip: isMultiple || !pPanel?.isGIF, separate: true },
  //     {
  //       skip: isMultiple,
  //       label: t("boards.panelMenu.crop"),
  //       click: () => {
  //         beginCrop(petaPanel);
  //       },
  //     },
  //     { skip: isMultiple, separate: true },
  //     { label: t("boards.panelMenu.flipHorizontal"), click: () => flipPetaPanel("horizontal") },
  //     { label: t("boards.panelMenu.flipVertical"), click: () => flipPetaPanel("vertical") },
  //     { separate: true },
  //     { label: t("boards.panelMenu.reset"), click: resetPetaPanel },
  //     { separate: true },
  //     { label: t("boards.panelMenu.remove"), click: removeSelectedPanels },
  //   ],
  //   position,
  // );
}
function changeOrder(to: "front" | "back") {
  emit(
    "update:petaPanels",
    props.selectedPetaPanels.map((pp) => ({
      ...pp,
      index: pp.index + props.petaPanels.length * (to === "front" ? 1 : -1),
    })),
  );
  emit("sortIndex");
}
// function openDetails(petaPanel: PetaPanel) {
//   IPC.send("setDetailsPetaImage", petaImage);
//   IPC.send("openWindow", WindowType.DETAILS);
// }
function resetPetaPanel() {
  emit(
    "update:petaPanels",
    props.selectedPetaPanels.map((pp) => ({
      ...pp,
      height: Math.abs(pp.height),
      width: Math.abs(pp.width),
      // pPanel.petaPanel.crop.position.set(0, 0);
      crop: {
        ...pp.crop,
        position: new Vec2(0, 0),
        width: 1,
        height: 1,
      },
      rotation: 0,
    })),
  );
}
function removeSelectedPanels() {
  emit("removeSelectedPanels");
}
function flipPetaPanel(direction: "vertical" | "horizontal") {
  emit(
    "update:petaPanels",
    props.selectedPetaPanels.map((pp) => ({
      ...pp,
      width: direction === "horizontal" ? -pp.width : pp.width,
      height: direction === "vertical" ? -pp.height : pp.height,
    })),
  );
}
function close(): void {
  show.value = false;
}
defineExpose({
  open,
  close,
});
</script>

<style lang="scss" scoped>
t-content {
  display: block;
  padding: var(--px-2);
  max-width: 256px;
}
</style>
