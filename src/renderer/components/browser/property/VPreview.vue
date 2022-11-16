<template>
  <t-previews-root>
    <t-previews
      ref="previews"
      v-show="!noImage"
      @contextmenu="menu"
      @dragstart="dragstart($event)"
      draggable="true"
    >
      <VPropertyThumbnail
        v-for="data in propertyThumbnails"
        :key="data.petaImage.id"
        :propertyThumbnail="data"
      />
    </t-previews>
    <p>{{ t("browser.property.selectedImage", [petaImages.length]) }}</p>
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
// Vue
import { computed, ref, onMounted } from "vue";
// Components
import VPropertyThumbnail from "@/renderer/components/browser/property/VPropertyThumbnail.vue";
// Others
import { Vec2, vec2FromPointerEvent } from "@/commons/utils/vec2";
import { MAX_PREVIEW_COUNT } from "@/commons/defines";
import { PetaImage } from "@/commons/datas/petaImage";
import { PropertyThumbnail } from "@/renderer/components/browser/property/propertyThumbnail";
import { IPC } from "@/renderer/ipc";
import { WindowType } from "@/commons/datas/windowType";
import { useI18n } from "vue-i18n";
import { resizeImage } from "@/commons/utils/resizeImage";
import { useResizerStore } from "@/renderer/stores/resizerStore";
const emit = defineEmits<{
  (e: "clearSelectionAll"): void;
  (e: "menu", petaImage: PetaImage, position: Vec2): void;
  (e: "drag", petaImage: PetaImage): void;
}>();
const props = defineProps<{
  petaImages: PetaImage[];
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
  const petaImage = props.petaImages[0];
  if (petaImage === undefined) return;
  emit("menu", petaImage, vec2FromPointerEvent(e));
}
function dragstart(event: PointerEvent) {
  event.preventDefault();
  const petaImage = props.petaImages[0];
  if (petaImage === undefined) return;
  emit("drag", petaImage);
}
function resizePreviews(rect: DOMRectReadOnly) {
  previewWidth.value = rect.width;
  previewHeight.value = rect.height;
}
function clearSelection() {
  emit("clearSelectionAll");
}
function openDetails() {
  const petaImage = props.petaImages[0];
  if (petaImage) {
    IPC.send("setDetailsPetaImage", petaImage.id);
    IPC.send("openWindow", WindowType.DETAILS);
  }
}
const propertyThumbnails = computed<PropertyThumbnail[]>(() => {
  const maxWidth = props.petaImages.length === 1 ? previewWidth.value : previewWidth.value * 0.7;
  const petaImages = [...props.petaImages];
  // プレビュー数の最大を抑える。
  petaImages.splice(0, petaImages.length - MAX_PREVIEW_COUNT);
  const thumbnails = petaImages.map((p): PropertyThumbnail => {
    let width = 0;
    let height = 0;
    if (p.height / p.width < previewHeight.value / maxWidth) {
      const size = resizeImage(p.width, p.height, maxWidth, "width");
      width = size.width;
      height = size.height;
    } else {
      const size = resizeImage(p.width, p.height, previewHeight.value, "height");
      height = size.height;
      width = size.width;
    }
    return {
      petaImage: p,
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
      petaImages.length > 1
        ? (previewWidth.value - last.width) * (i / (petaImages.length - 1))
        : previewWidth.value / 2 - thumb.width / 2,
      previewHeight.value / 2 - thumb.height / 2,
    );
  });
  return thumbnails;
});
const noImage = computed<boolean>(() => {
  return props.petaImages.length === 0;
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
