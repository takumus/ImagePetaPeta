<template>
  <VFloating
    :visible="show"
    :z-index="zIndex"
    :max-width="'512px'"
    :max-height="'unset'"
    ref="floating">
    <t-content>
      <t-draggable @pointerdown="startDrag"></t-draggable>
      <!-- <p v-for="p in selectedPetaPanels" :key="p.id">{{ p.id }}</p> -->
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
      <VPlaybackController
        v-if="singleSelectedPlayableContent"
        :p-file-object-content="singleSelectedPlayableContent"
        @paused="pausePlayback"
        @seek="seekPlayback"
        @volume="volumeVideo"
        @speed="speedPlayback" />
    </t-content>
  </VFloating>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

import VPlaybackController from "@/renderer/components/commons/playbackController/VPlaybackController.vue";
import VFloating from "@/renderer/components/commons/utils/floating/VFloating.vue";

import { RPetaPanel } from "@/commons/datas/rPetaPanel";
import { WindowType } from "@/commons/datas/windowType";
import { resizeImage } from "@/commons/utils/resizeImage";
import { Vec2, vec2FromPointerEvent } from "@/commons/utils/vec2";

import { initBoardLoader } from "@/renderer/components/board/boardLoader";
import { IPC } from "@/renderer/libs/ipc";
import { PPlayableFileObjectContent } from "@/renderer/utils/pFileObject/pPlayableFileObjectContainer";
import { PVideoFileObjectContent } from "@/renderer/utils/pFileObject/video";

const props = defineProps<{
  zIndex: number;
  selectedPetaPanels: RPetaPanel[];
  petaPanels: RPetaPanel[];
  boardLoader: ReturnType<typeof initBoardLoader>;
}>();
const emit = defineEmits<{
  (e: "update:petaPanels", updates: RPetaPanel[]): void;
  (e: "sortIndex"): void;
  (e: "removeSelectedPanels"): void;
}>();
const { t } = useI18n();
const show = ref(false);
const floating = ref<InstanceType<typeof VFloating>>();
const startDragOffset = ref<Vec2>();
onMounted(() => {
  //
});
function startDrag(event: PointerEvent) {
  const rect = (floating.value?.$el as HTMLElement | undefined)?.getBoundingClientRect();
  if (rect === undefined) {
    return;
  }
  startDragOffset.value = vec2FromPointerEvent(event).sub(rect);
  window.addEventListener("pointermove", pointerMove);
  window.addEventListener("pointerup", pointerUp);
}
function pointerMove(event: PointerEvent) {
  if (startDragOffset.value === undefined) {
    return;
  }
  const position = vec2FromPointerEvent(event).sub(startDragOffset.value);
  floating.value?.updateFloating(
    { ...position, width: 0, height: 0 },
    { shrinkHeight: false, shrinkWidth: false, insideParentElement: true },
  );
}
function pointerUp() {
  startDragOffset.value = undefined;
}
function pausePlayback(paused: boolean) {
  const pPetaPanel = singleSelectedPPetaPanel.value;
  if (pPetaPanel === undefined) {
    return;
  }
  if (
    pPetaPanel.pFileObject.content instanceof PPlayableFileObjectContent &&
    (pPetaPanel.petaPanel.status.type === "video" || pPetaPanel.petaPanel.status.type === "gif")
  ) {
    pPetaPanel.petaPanel.status.paused = paused;
    pPetaPanel.petaPanel.status.time = pPetaPanel.pFileObject.content.getCurrentTime();
    emit("update:petaPanels", [pPetaPanel.petaPanel]);
  }
}
function seekPlayback() {
  const pPetaPanel = singleSelectedPPetaPanel.value;
  if (pPetaPanel === undefined) {
    return;
  }
  if (
    pPetaPanel.pFileObject.content instanceof PPlayableFileObjectContent &&
    (pPetaPanel.petaPanel.status.type === "video" || pPetaPanel.petaPanel.status.type === "gif")
  ) {
    pPetaPanel.petaPanel.status.time = pPetaPanel.pFileObject.content.getCurrentTime();
    emit("update:petaPanels", [pPetaPanel.petaPanel]);
  }
}
function speedPlayback() {
  const pPetaPanel = singleSelectedPPetaPanel.value;
  if (pPetaPanel === undefined) {
    return;
  }
  if (
    pPetaPanel.pFileObject.content instanceof PPlayableFileObjectContent &&
    (pPetaPanel.petaPanel.status.type === "video" || pPetaPanel.petaPanel.status.type === "gif")
  ) {
    pPetaPanel.petaPanel.status.speed = pPetaPanel.pFileObject.content.getSpeed();
    emit("update:petaPanels", [pPetaPanel.petaPanel]);
  }
}
function volumeVideo() {
  const pPetaPanel = singleSelectedPPetaPanel.value;
  if (pPetaPanel === undefined) {
    return;
  }
  if (
    pPetaPanel.pFileObject.content instanceof PVideoFileObjectContent &&
    pPetaPanel.petaPanel.status.type === "video"
  ) {
    pPetaPanel.petaPanel.status.volume = pPetaPanel.pFileObject.content.getVolume();
    emit("update:petaPanels", [pPetaPanel.petaPanel]);
  }
}
function open(position: Vec2, width = 0, height = 0): void {
  show.value = true;
  floating.value?.updateFloating(
    { ...position, width: width, height: height },
    { shrinkHeight: false, shrinkWidth: false, insideParentElement: true },
  );
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
    props.selectedPetaPanels.map((pp) => {
      const pP = props.boardLoader.getPPanelFromId(pp.id);
      let width = 0;
      let height = 0;
      const baseWidth = pP?.pFileObject.content?.width ?? 0;
      const baseHeight = pP?.pFileObject.content?.height ?? 0;
      const maxWidth = pp.width;
      const maxHeight = pp.height;
      if (maxWidth > maxHeight) {
        const size = resizeImage(baseWidth, baseHeight, maxWidth, "width");
        width = size.width;
        height = size.height;
      } else {
        const size = resizeImage(baseWidth, baseHeight, maxHeight, "height");
        height = size.height;
        width = size.width;
      }
      return {
        ...pp,
        height: height,
        width: width,
        flipHorizontal: false,
        flipVertical: false,
        crop: {
          ...pp.crop,
          position: new Vec2(0, 0),
          width: 1,
          height: 1,
        },
        rotation: 0,
      };
    }),
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
      flipVertical: direction === "vertical" ? !pp.flipVertical : pp.flipVertical,
      flipHorizontal: direction === "horizontal" ? !pp.flipHorizontal : pp.flipHorizontal,
    })),
  );
}
function close(): void {
  show.value = false;
}
const singleSelectedPetaPanel = computed(() =>
  props.selectedPetaPanels.length === 1 ? props.selectedPetaPanels[0] : undefined,
);
const singleSelectedPPetaPanel = computed(() =>
  singleSelectedPetaPanel.value
    ? props.boardLoader.getPPanelFromId(singleSelectedPetaPanel.value.id)
    : undefined,
);
const singleSelectedPlayableContent = computed(() => {
  return singleSelectedPPetaPanel.value?.pFileObject.content instanceof PPlayableFileObjectContent
    ? singleSelectedPPetaPanel.value.pFileObject.content
    : undefined;
});
watch(
  () => props.selectedPetaPanels.length,
  (length) => {
    if (length === 0) {
      if (show.value) {
        close();
      }
    }
  },
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
  padding-top: calc(var(--px-4));
  max-width: 512px;
  > t-draggable {
    display: block;
    width: 100%;
    height: var(--px-4);
    position: absolute;
    top: 0px;
    left: 0px;
    cursor: grab;
    // background-color: #ff0000;
  }
}
</style>
