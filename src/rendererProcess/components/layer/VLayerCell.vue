<template>
  <li
    class="layer-cell-root"
    :class="{
      drag: drag,
      selected: selected,
    }"
    @pointerdown.left="pointerdown($event)"
  >
    <t-icon
      class="visible"
      ref="visibleIcon"
      :class="{
        disabled: !visible,
      }"
    >
    </t-icon>
    <t-icon
      class="lock"
      ref="lockedIcon"
      :class="{
        disabled: !locked,
      }"
    >
    </t-icon>
    <t-thumb
      v-if="url"
      :style="{
        backgroundImage: `url(${url})`,
      }"
    >
      <t-nsfw v-if="nsfwMask"></t-nsfw>
    </t-thumb>
  </li>
</template>

<script setup lang="ts">
// Vue
import { computed, onMounted, onUnmounted, ref } from "vue";
import { ImageType } from "@/commons/datas/imageType";
import { getImageURL } from "@/rendererProcess/utils/imageURL";
import { ClickChecker } from "@/rendererProcess/utils/clickChecker";
import { vec2FromPointerEvent } from "@/commons/utils/vec2";
import { PetaPanel } from "@/commons/datas/petaPanel";
import { useNSFWStore } from "@/rendererProcess/stores/nsfwStore";
import { usePetaImagesStore } from "@/rendererProcess/stores/petaImagesStore";
// Others
const emit = defineEmits<{
  (e: "startDrag", cellData: { id: number; data: PetaPanel }, event: PointerEvent): void;
  (e: "update:cellData", cellData: { id: number; data: PetaPanel }): void;
}>();
const props = defineProps<{
  cellData?: {
    id: number;
    data: PetaPanel;
  };
  drag?: boolean;
}>();
const petaImagesStore = usePetaImagesStore();
const visibleIcon = ref<HTMLElement>();
const lockedIcon = ref<HTMLElement>();
const nsfwStore = useNSFWStore();
const click = new ClickChecker();
let mouseIsDown = false;
onMounted(() => {
  window.addEventListener("pointerup", pointerup);
  window.addEventListener("pointermove", pointermove);
});
onUnmounted(() => {
  window.removeEventListener("pointerup", pointerup);
  window.removeEventListener("pointermove", pointermove);
});
const url = computed(() => {
  return props.cellData
    ? getImageURL(
        petaImagesStore.getPetaImage(props.cellData.data.petaImageId),
        ImageType.THUMBNAIL,
      )
    : undefined;
});
const selected = computed(() => {
  return props.cellData?.data._selected;
});
const locked = computed(() => {
  return props.cellData?.data.locked;
});
const visible = computed(() => {
  return props.cellData?.data.visible;
});
const nsfwMask = computed(() => {
  return (
    petaImagesStore.getPetaImage(props.cellData?.data.petaImageId)?.nsfw && !nsfwStore.state.value
  );
});
function pointerdown(event: PointerEvent) {
  click.down(vec2FromPointerEvent(event));
  mouseIsDown = true;
}
function pointerup(event: PointerEvent) {
  mouseIsDown = false;
  if (click.isClick && props.cellData) {
    if (event.target === visibleIcon.value) {
      // props.cellData.data.visible = !props.cellData.data?.visible;
      emit("update:cellData", {
        ...props.cellData,
        data: {
          ...props.cellData.data,
          visible: !props.cellData.data.visible,
        },
      });
    } else if (event.target === lockedIcon.value) {
      // props.cellData.data.locked = !props.cellData.data?.locked;
      emit("update:cellData", {
        ...props.cellData,
        data: {
          ...props.cellData.data,
          locked: !props.cellData.data.locked,
        },
      });
    }
  }
}
function pointermove(event: PointerEvent) {
  if (!mouseIsDown) {
    return;
  }
  click.move(vec2FromPointerEvent(event));
  if (!click.isClick) {
    mouseIsDown = false;
    if (props.cellData) {
      emit("startDrag", props.cellData, event);
    }
  }
}
</script>

<style lang="scss" scoped>
.layer-cell-root {
  cursor: pointer;
  margin: 0px;
  padding: 4px;
  background-color: var(--color-main);
  display: flex;
  align-items: center;
  height: 64px;
  width: 100%;
  &.selected {
    background-color: var(--color-hover) !important;
  }
  &.drag,
  &:hover {
    background-color: var(--color-hover);
  }
  &.drag {
    position: absolute;
    top: 0px;
  }
  > t-icon {
    padding: 0px 8px;
    height: 100%;
    width: 24px;
    background: no-repeat;
    background-position: center center;
    background-size: 12px;
    display: block;
    filter: var(--filter-icon);
    &.visible {
      background-size: 14px;
      background-image: url("~@/@assets/visible.png");
    }
    &.lock {
      background-size: 11px;
      background-image: url("~@/@assets/locked.png");
    }
    &.disabled {
      opacity: 0.3;
    }
  }
  > t-thumb {
    min-width: 32px;
    height: 100%;
    margin: 0px 8px;
    flex: 1;
    background: no-repeat;
    background-position: center center;
    background-size: contain;
    display: block;
    > t-nsfw {
      width: 100%;
      height: 100%;
      display: block;
      background-size: 24px;
      background-position: center;
      background-repeat: repeat;
      background-image: url("~@/@assets/nsfwBackground.png");
    }
  }
  > .name {
    flex: 1;
    overflow: hidden;
    max-height: 100%;
    word-break: break-word;
  }
}
</style>
