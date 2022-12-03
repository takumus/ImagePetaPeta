<template>
  <VFloating
    :visible="show"
    :z-index="zIndex"
    :max-width="'512px'"
    :max-height="'unset'"
    ref="floating">
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
      <button
        v-if="singleSelectedPetaPanel"
        @click="singleSelectedPetaPanel ? openDetails(singleSelectedPetaPanel) : false">
        {{ t("boards.panelMenu.details") }}
      </button>
      <button
        v-if="
          singleSelectedPetaPanel &&
          singleSelectedPetaFile?.metadata.type === 'image' &&
          singleSelectedPetaFile.metadata.gif
        "
        @click="playGIF">
        {{
          t(
            `boards.panelMenu.${
              singleSelectedPetaPanel.status.type === "gif" &&
              singleSelectedPetaPanel.status.stopped
                ? "playGIF"
                : "stopGIF"
            }`,
          )
        }}
      </button>
      <button
        v-if="singleSelectedPetaPanel && singleSelectedPetaFile?.metadata.type === 'video'"
        @click="playVideo">
        {{
          t(
            `boards.panelMenu.${
              singleSelectedPetaPanel.status.type === "video" &&
              singleSelectedPetaPanel.status.stopped
                ? "playVideo"
                : "stopVideo"
            }`,
          )
        }}
      </button>
    </t-content>
  </VFloating>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";

import VFloating from "@/renderer/components/commons/utils/floating/VFloating.vue";

import { RPetaPanel } from "@/commons/datas/rPetaPanel";
import { WindowType } from "@/commons/datas/windowType";
import { Vec2 } from "@/commons/utils/vec2";

import { IPC } from "@/renderer/libs/ipc";
import { usePetaFilesStore } from "@/renderer/stores/petaFilesStore/usePetaFilesStore";
import { searchParentElement } from "@/renderer/utils/searchParentElement";

const petaFilesStore = usePetaFilesStore();
const props = defineProps<{
  zIndex: number;
  selectedPetaPanels: RPetaPanel[];
  petaPanels: RPetaPanel[];
}>();
const emit = defineEmits<{
  (e: "update:petaPanels", updates: RPetaPanel[]): void;
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
function playGIF(): void {
  if (singleSelectedPetaPanel.value !== undefined) {
    const isGIF = singleSelectedPetaPanel.value.status.type === "gif";
    const stopped =
      singleSelectedPetaPanel.value.status.type === "gif"
        ? singleSelectedPetaPanel.value.status.stopped
        : true;
    singleSelectedPetaPanel.value.status = {
      type: "gif",
      time: 0,
      stopped: !isGIF ? false : !stopped,
    };
    emit("update:petaPanels", [singleSelectedPetaPanel.value]);
  }
}
function playVideo(): void {
  if (singleSelectedPetaPanel.value !== undefined) {
    const isGIF = singleSelectedPetaPanel.value.status.type === "video";
    const stopped =
      singleSelectedPetaPanel.value.status.type === "video"
        ? singleSelectedPetaPanel.value.status.stopped
        : true;
    singleSelectedPetaPanel.value.status = {
      type: "video",
      time: 0,
      volume: 0,
      stopped: !isGIF ? false : !stopped,
    };
    emit("update:petaPanels", [singleSelectedPetaPanel.value]);
  }
}
function open(position: Vec2): void {
  show.value = true;
  floating.value?.updateFloating({ ...position, width: 0, height: 0 });
  // const petaFile = petaFilesStore.getPetaFile(petaPanel.petaFileId);
  // const isMultiple = selectedPPetaPanels().length > 1;
  // .contextMenu.open(
  //   [
  //     { label: t("boards.panelMenu.toFront"), click: () => changeOrder("front") },
  //     { label: t("boards.panelMenu.toBack"), click: () => changeOrder("back") },
  //     { separate: true },
  //     { label: t("boards.panelMenu.details"), click: () => openDetails(petaFile) },
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
function openDetails(petaPanel: RPetaPanel) {
  IPC.send("setDetailsPetaFile", petaPanel.petaFileId);
  IPC.send("openWindow", WindowType.DETAILS);
}
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
const singleSelectedPetaPanel = computed(() =>
  props.selectedPetaPanels.length === 1 ? props.selectedPetaPanels[0] : undefined,
);
const singleSelectedPetaFile = computed(() =>
  singleSelectedPetaPanel.value !== undefined
    ? petaFilesStore.getPetaFile(singleSelectedPetaPanel.value.petaFileId)
    : undefined,
);
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
