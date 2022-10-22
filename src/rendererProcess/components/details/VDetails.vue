<template>
  <t-details-root
    ref="detailsRoot"
    :style="{
      zIndex: zIndex,
    }"
  >
    <t-img
      :style="{
        top: position.y + stageRect.y / 2 + 'px',
        left: position.x + stageRect.x / 2 + 'px',
        width: props.petaImage.width * scale + 'px',
        height: props.petaImage.height * scale + 'px',
      }"
    >
      <img v-show="loaded" :src="url" draggable="false" @load="loaded = true" />
      <t-nsfw v-if="props.petaImage.nsfw"></t-nsfw>
    </t-img>
  </t-details-root>
</template>

<script setup lang="ts">
// Vue
import { ImageType } from "@/commons/datas/imageType";
import { PetaImage } from "@/commons/datas/petaImage";
import { BOARD_ZOOM_MAX, BOARD_ZOOM_MIN } from "@/commons/defines";
import { resizeImage } from "@/commons/utils/resizeImage";
import { Vec2, vec2FromPointerEvent } from "@/commons/utils/vec2";
import { useResizerStore } from "@/rendererProcess/stores/resizerStore";
import { useSettingsStore } from "@/rendererProcess/stores/settingsStore";
import { useSystemInfoStore } from "@/rendererProcess/stores/systemInfoStore";
import { getImageURL } from "@/rendererProcess/utils/imageURL";
import { ref, onMounted, onUnmounted, watch, computed } from "vue";
// Components
const props = defineProps<{
  petaImage: PetaImage;
  zIndex: number;
}>();
const detailsRoot = ref<HTMLElement>();
const mouseOffset = new Vec2();
const stageRect = ref(new Vec2());
const { systemInfo } = useSystemInfoStore();
const scale = ref(1);
const position = ref(new Vec2());
const settingsStore = useSettingsStore();
const resizerStore = useResizerStore();
const pointerPosition = new Vec2();
const dragging = ref(false);
const loaded = ref(false);
let moved = false;
onMounted(() => {
  detailsRoot.value?.addEventListener("mousewheel", wheel as (e: Event) => void);
  detailsRoot.value?.addEventListener("pointerdown", pointerdown);
  detailsRoot.value?.addEventListener("dblclick", reset);
  window.addEventListener("pointerup", pointerup);
  window.addEventListener("pointermove", pointermove);
  resizerStore.on("resize", resize);
  resizerStore.observe(detailsRoot.value);
  if (detailsRoot.value !== undefined) {
    resize(detailsRoot.value.getBoundingClientRect());
  }
});
onUnmounted(() => {
  detailsRoot.value?.removeEventListener("mousewheel", wheel as (e: Event) => void);
  detailsRoot.value?.removeEventListener("pointerdown", pointerdown);
  window.removeEventListener("pointerup", pointerup);
  window.removeEventListener("pointermove", pointermove);
});
function resize(rect: DOMRect | DOMRectReadOnly) {
  mouseOffset.set(detailsRoot.value?.getBoundingClientRect());
  stageRect.value.set(rect.width, rect.height);
  if (!moved) {
    reset();
  }
}
function reset() {
  moved = false;
  scale.value = defaultScale.value;
  position.value.x = (-props.petaImage.width * defaultScale.value) / 2;
  position.value.y = (-props.petaImage.height * defaultScale.value) / 2;
}
function pointerdown(event: PointerEvent) {
  pointerPosition.set(vec2FromPointerEvent(event));
  dragging.value = true;
}
function pointerup() {
  dragging.value = false;
}
function pointermove(event: PointerEvent) {
  if (!dragging.value) {
    return;
  }
  moved = true;
  const p = vec2FromPointerEvent(event);
  const vec = p.clone().sub(pointerPosition);
  position.value.add(vec);
  pointerPosition.set(p);
}
function wheel(event: WheelEvent) {
  const mouse = vec2FromPointerEvent(event).sub(mouseOffset).sub(stageRect.value.clone().div(2));
  if (event.ctrlKey || systemInfo.value.platform === "win32") {
    const currentZoom = scale.value;
    scale.value *= 1 + -event.deltaY * settingsStore.state.value.zoomSensitivity * 0.00001;
    if (scale.value > BOARD_ZOOM_MAX) {
      scale.value = BOARD_ZOOM_MAX;
    } else if (scale.value < BOARD_ZOOM_MIN) {
      scale.value = BOARD_ZOOM_MIN;
    }
    position.value
      .mult(-1)
      .add(mouse)
      .mult(scale.value / currentZoom)
      .sub(mouse)
      .mult(-1);
  } else {
    position.value.add(
      new Vec2(event.deltaX, event.deltaY)
        .mult(settingsStore.state.value.moveSensitivity)
        .mult(-0.01),
    );
  }
  moved = true;
}
const url = computed(() => {
  return getImageURL(props.petaImage, ImageType.ORIGINAL);
});
const defaultScale = computed(() => {
  let width = 0;
  let height = 0;
  const maxWidth = stageRect.value.x * 1;
  const maxHeight = stageRect.value.y * 1;
  if (props.petaImage.height / props.petaImage.width < maxHeight / maxWidth) {
    const size = resizeImage(props.petaImage.width, props.petaImage.height, maxWidth, "width");
    width = size.width;
    height = size.height;
  } else {
    const size = resizeImage(props.petaImage.width, props.petaImage.height, maxHeight, "height");
    height = size.height;
    width = size.width;
  }
  height;
  return width / props.petaImage.width;
});
watch(
  () => props.petaImage,
  () => {
    reset();
    loaded.value = false;
  },
);
</script>

<style lang="scss" scoped>
t-details-root {
  position: relative;
  width: 100%;
  height: 100%;
  display: block;
  background-image: url("~@/@assets/transparentBackground.png");
  overflow: hidden;
  > t-img {
    display: block;
    position: absolute;
    > img,
    t-nsfw {
      width: 100%;
      height: 100%;
      position: absolute;
      top: 0px;
      left: 0px;
    }
    > t-nsfw {
      background-size: 32px;
      background-position: center;
      background-repeat: repeat;
      background-image: url("~@/@assets/nsfwBackground.png");
    }
  }
}
</style>
