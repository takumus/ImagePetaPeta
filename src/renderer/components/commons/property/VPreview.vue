<template>
  <t-previews-root>
    <t-previews
      ref="previews"
      v-show="!noImage"
      @contextmenu="menu"
      @dragstart="dragstart($event)"
      draggable="true">
      <VPropertyThumbnail
        v-for="data in propertyThumbnails"
        :key="data.petaFile.id"
        :property-thumbnail="data" />
    </t-previews>
    <p>{{ t("browser.property.selectedImage", [petaFiles.length]) }}</p>
    <t-buttons v-show="!noImage">
      <button tabindex="-1" @click="clearSelection">
        {{ t("browser.property.clearSelectionButton") }}
      </button>
      <button tabindex="-1" v-if="propertyThumbnails.length === 1" @click="openDetails">
        {{ t("browser.property.openDetailsButton") }}
      </button>
    </t-buttons>
  </t-previews-root>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";

import VPropertyThumbnail from "@/renderer/components/commons/property/VPropertyThumbnail.vue";

import { RPetaFile } from "@/commons/datas/rPetaFile";
import { WindowType } from "@/commons/datas/windowType";
import { MAX_PREVIEW_COUNT } from "@/commons/defines";
import { resizeImage } from "@/commons/utils/resizeImage";
import { Vec2, vec2FromPointerEvent } from "@/commons/utils/vec2";

import { PropertyThumbnail } from "@/renderer/components/commons/property/propertyThumbnail";
import { IPC } from "@/renderer/libs/ipc";
import { useResizerStore } from "@/renderer/stores/resizerStore/useResizerStore";

const emit = defineEmits<{
  (e: "clearSelectionAll"): void;
  (e: "menu", petaFile: RPetaFile, position: Vec2): void;
  (e: "drag", petaFile: RPetaFile): void;
}>();
const props = defineProps<{
  petaFiles: RPetaFile[];
}>();
const { t } = useI18n();
const previews = ref<HTMLElement>();
const previewWidth = ref(0);
const previewHeight = ref(0);
const resizerStore = useResizerStore();
onMounted(() => {
  resizerStore.on("resize", resizePreviews);
  resizerStore.observe(previews.value);
});
function menu(e: MouseEvent) {
  const petaFile = props.petaFiles[0];
  if (petaFile === undefined) return;
  emit("menu", petaFile, vec2FromPointerEvent(e));
}
function dragstart(event: PointerEvent) {
  event.preventDefault();
  const petaFile = props.petaFiles[0];
  if (petaFile === undefined) return;
  emit("drag", petaFile);
}
function resizePreviews(rect: DOMRectReadOnly) {
  previewWidth.value = rect.width;
  previewHeight.value = rect.height;
}
function clearSelection() {
  emit("clearSelectionAll");
}
function openDetails() {
  const petaFile = props.petaFiles[0];
  if (petaFile) {
    IPC.send("setDetailsPetaFile", petaFile.id);
    IPC.send("openWindow", WindowType.DETAILS);
  }
}
const propertyThumbnails = computed<PropertyThumbnail[]>(() => {
  const maxWidth = props.petaFiles.length === 1 ? previewWidth.value : previewWidth.value * 0.7;
  const petaFiles = [...props.petaFiles];
  // プレビュー数の最大を抑える。
  petaFiles.splice(0, petaFiles.length - MAX_PREVIEW_COUNT);
  const thumbnails = petaFiles.map((p): PropertyThumbnail => {
    let width = 0;
    let height = 0;
    if (p.metadata.height / p.metadata.width < previewHeight.value / maxWidth) {
      const size = resizeImage(p.metadata.width, p.metadata.height, maxWidth, "width");
      width = size.width;
      height = size.height;
    } else {
      const size = resizeImage(p.metadata.width, p.metadata.height, previewHeight.value, "height");
      height = size.height;
      width = size.width;
    }
    return {
      petaFile: p,
      position: new Vec2(0, 0),
      width: width,
      height: height,
    };
  });
  const last = thumbnails[thumbnails.length - 1];
  if (last === undefined) {
    return [];
  }
  thumbnails.forEach((thumb, i) => {
    thumb.position = new Vec2(
      petaFiles.length > 1
        ? (previewWidth.value - last.width) * (i / (petaFiles.length - 1))
        : previewWidth.value / 2 - thumb.width / 2,
      previewHeight.value / 2 - thumb.height / 2,
    );
  });
  return thumbnails;
});
const noImage = computed<boolean>(() => {
  return props.petaFiles.length === 0;
});
</script>

<style lang="scss" scoped>
t-previews-root {
  width: 100%;
  position: relative;
  display: flex;
  flex-direction: column;
  flex-shrink: 2;
  > t-previews {
    position: relative;
    width: 100%;
    height: 150px;
    overflow: hidden;
    display: block;
    cursor: pointer;
  }
  > t-buttons {
    text-align: center;
    display: block;
  }
  p {
    text-align: center;
    margin: var(--px-1) 0px;
  }
}
</style>
