<template>
  <t-property-root>
    <t-previews
      ref="previews"
      v-show="!noImage"
    >
      <VPropertyThumbnail
        v-for="(data) in propertyThumbnails"
        :key="data.petaImage.id"
        :propertyThumbnail="data"
      />
    </t-previews>
    <p>{{$t("browser.property.selectedImage", [petaImages.length])}}</p>
    <t-buttons
      v-show="!noImage"
    >
      <button
        tabindex="-1"
        @click="clearSelection"
      >
        {{$t("browser.property.clearSelectionButton")}}
      </button>
      <button
        tabindex="-1"
        v-if="propertyThumbnails.length === 1"
        @click="openDetails"
      >
        {{$t("browser.property.openDetailsButton")}}
      </button>
    </t-buttons>
  </t-property-root>
</template>

<script setup lang="ts">
// Vue
import { computed, ref, onMounted, onUnmounted } from "vue";
// Components
import VPropertyThumbnail from "@/rendererProcess/components/browser/property/VPropertyThumbnail.vue";
// Others
import { Vec2, vec2FromPointerEvent } from "@/commons/utils/vec2";
import { MAX_PREVIEW_COUNT, UNTAGGED_ID } from "@/commons/defines";
import { PetaImage } from "@/commons/datas/petaImage";
import { PropertyThumbnail } from "@/rendererProcess/components/browser/property/propertyThumbnail";
import { API } from "@/rendererProcess/api";
import { WindowType } from "@/commons/datas/windowType";
const props = defineProps<{
  petaImages: PetaImage[],
}>();
const previews = ref<HTMLElement>();
const previewWidth = ref(0);
const previewHeight = ref(0);
const previewsResizer: ResizeObserver = new ResizeObserver((entries) => {
  resizePreviews(entries[0]!.contentRect);
});
onMounted(() => {
  if (previews.value) {
    previewsResizer.observe(previews.value);
  }
});
onUnmounted(() => {
  if (previews.value) {
    previewsResizer.unobserve(previews.value);
    previewsResizer.disconnect();
  }
});
function resizePreviews(rect: DOMRectReadOnly) {
  previewWidth.value = rect.width;
  previewHeight.value = rect.height;
}
function clearSelection() {
  props.petaImages.forEach((pi) => {
    pi._selected = false;
  })
}
function openDetails() {
  const petaImage = props.petaImages[0];
  if (petaImage) {
    API.send("setDetailsPetaImage", petaImage);
    API.send("openWindow", WindowType.DETAILS);
  }
}
const propertyThumbnails = computed<PropertyThumbnail[]>(() => {
  const maxWidth = props.petaImages.length === 1 ? previewWidth.value : previewWidth.value * 0.7;
  const petaImages = [...props.petaImages];
  // プレビュー数の最大を抑える。
  petaImages.splice(0, petaImages.length - MAX_PREVIEW_COUNT);
  const thumbnails = petaImages.map((p, i): PropertyThumbnail => {
    let width = 0;
    let height = 0;
    if (p.height / p.width < previewHeight.value / maxWidth) {
      width = maxWidth;
      height = maxWidth * p.height;
    } else {
      height = previewHeight.value;
      width = previewHeight.value / p.height;
    }
    return {
      petaImage: p,
      position: new Vec2(0, 0),
      width: width,
      height: height
    }
  });
  const last = thumbnails[thumbnails.length - 1]!;
  thumbnails.forEach((thumb, i) => {
    thumb.position = new Vec2(
      petaImages.length > 1 ? (previewWidth.value - last.width) * (i / (petaImages.length - 1)) : previewWidth.value / 2 - thumb.width / 2,
      previewHeight.value / 2 - thumb.height / 2
    )
  });
  return thumbnails;
});
const noImage = computed<boolean>(() => {
  return props.petaImages.length === 0;
});
</script>

<style lang="scss" scoped>
t-property-root {
  width: 100%;
  // color: #333333;
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  >t-previews {
    position: relative;
    width: 100%;
    height: 150px;
    overflow: hidden;
    display: block;
  }
  >t-buttons {
    text-align: center;
    display: block;
  }
  p {
    text-align: center;
    margin: 4px 0px;
  }
}
</style>