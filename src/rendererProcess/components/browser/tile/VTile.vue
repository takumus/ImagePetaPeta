<template>
  <t-tile-root
    :style="{
      transform: `translate(${tile.position.x + 'px'}, ${tile.position.y + 'px'})`,
      width: tile.width + 'px',
      height: tile.height + 'px',
    }"
  >
    <t-tile-wrapper v-if="tile.group === undefined && tile.petaImage !== undefined">
      <t-images
        @pointerdown="pointerdown($event)"
        @dragstart="dragstart($event)"
        @dblclick="dblclick"
        draggable="true"
        :class="{
          selected,
        }"
      >
        <t-nsfw v-if="nsfwMask"> </t-nsfw>
        <t-placeholder
          class="placeholder"
          :class="{
            loaded: !loadingThumbnail,
          }"
          :style="{
            backgroundColor: placeholderColor,
          }"
        ></t-placeholder>
        <img
          draggable="false"
          :src="thumbnailURL"
          @load="loadingThumbnail = false"
          v-if="loadingOriginal"
          decoding="async"
        />
        <img ref="image" draggable="false" v-show="!loadingOriginal" />
        <t-background> </t-background>
      </t-images>
      <t-tags
        v-if="settingsStore.state.value.showTagsOnTile"
        :class="{
          selected,
        }"
      >
        <t-tag v-for="petaTag in myPetaTags" :key="petaTag.id">
          {{ petaTag.name }}
        </t-tag>
        <t-tag v-if="myPetaTags.length === 0 && !loadingTags">
          {{ t("browser.untagged") }}
        </t-tag>
      </t-tags>
      <t-selected v-show="selected"> </t-selected>
    </t-tile-wrapper>
    <t-group v-else>
      {{ tile.group }}
    </t-group>
  </t-tile-root>
</template>

<script setup lang="ts">
// Vue
import { computed, ref, watch, onMounted, onUnmounted } from "vue";
// Others
import { Vec2, vec2FromPointerEvent } from "@/commons/utils/vec2";
import { getImageURL } from "@/rendererProcess/utils/imageURL";
import { Tile } from "@/rendererProcess/components/browser/tile/tile";
import { MouseButton } from "@/commons/datas/mouseButton";
import { ClickChecker } from "@/rendererProcess/utils/clickChecker";
import { ImageType } from "@/commons/datas/imageType";
import { IPC } from "@/rendererProcess/ipc";
import { PetaTag } from "@/commons/datas/petaTag";
import * as ImageDecoder from "@/rendererProcess/utils/serialImageDecoder";
import {
  BROWSER_FETCH_TAGS_DELAY,
  BROWSER_FETCH_TAGS_DELAY_RANDOM,
  BROWSER_LOAD_ORIGINAL_DELAY,
  BROWSER_LOAD_ORIGINAL_DELAY_RANDOM,
} from "@/commons/defines";
import { PetaImage } from "@/commons/datas/petaImage";
import { useNSFWStore } from "@/rendererProcess/stores/nsfwStore";
import { useSettingsStore } from "@/rendererProcess/stores/settingsStore";
import { useI18n } from "vue-i18n";
import { usePetaImagesStore } from "@/rendererProcess/stores/petaImagesStore";
import { usePetaTagsStore } from "@/rendererProcess/stores/petaTagsStore";

const emit = defineEmits<{
  (e: "select", tile: Tile): void;
  (e: "menu", tile: Tile, position: Vec2): void;
  (e: "drag", petaImage: PetaImage): void;
  (e: "dblclick", petaImage: PetaImage): void;
}>();
const props = defineProps<{
  tile: Tile;
  original: boolean;
  parentAreaMinY: number;
  parentAreaMaxY: number;
}>();
const nsfwStore = useNSFWStore();
const settingsStore = useSettingsStore();
const petaImagesStore = usePetaImagesStore();
const petaTagsStore = usePetaTagsStore();
const { t } = useI18n();
const thumbnailURL = ref("");
const image = ref<HTMLImageElement>();
const loadingThumbnail = ref(true);
const loadingOriginal = ref(true);
const loadingTags = ref(true);
const myPetaTags = ref<PetaTag[]>([]);
const click: ClickChecker = new ClickChecker();
let loadOriginalTimeoutHandler = -1;
let fetchTagsTimeoutHandler = -1;
let pressing = false;
const fetchingPetaTags = ref(false);
onMounted(() => {
  delayedLoadImage();
  delayedFetchPetaTags();
});
onUnmounted(() => {
  window.removeEventListener("pointermove", pointermove);
  window.removeEventListener("pointerup", pointerup);
  window.clearTimeout(loadOriginalTimeoutHandler);
  window.clearTimeout(fetchTagsTimeoutHandler);
});
function dragstart(event: PointerEvent) {
  event.preventDefault();
  if (props.tile.petaImage) {
    emit("drag", props.tile.petaImage);
  }
}
function pointerdown(event: PointerEvent) {
  click.down(new Vec2(event.clientX, event.clientY));
  window.addEventListener("pointermove", pointermove);
  window.addEventListener("pointerup", pointerup);
  switch (event.button) {
    case MouseButton.LEFT: {
      pressing = true;
      break;
    }
  }
}
function pointermove(event: PointerEvent) {
  if (!pressing) return;
  click.move(new Vec2(event.clientX, event.clientY));
  if (!click.isClick) {
    pressing = false;
  }
}
function pointerup(event: PointerEvent) {
  window.removeEventListener("pointermove", pointermove);
  window.removeEventListener("pointerup", pointerup);
  pressing = false;
  if (click.isClick) {
    switch (event.button) {
      case MouseButton.LEFT:
        emit("select", props.tile);
        break;
      case MouseButton.RIGHT:
        emit("menu", props.tile, vec2FromPointerEvent(event));
        break;
    }
  }
}
function dblclick() {
  if (props.tile.petaImage) {
    emit("dblclick", props.tile.petaImage);
  }
}
const nsfwMask = computed(() => {
  if (props.tile.petaImage === undefined) {
    return false;
  }
  return props.tile.petaImage.nsfw && !nsfwStore.state.value;
});
const placeholderColor = computed(() => {
  const petaColor = props.tile.petaImage?.palette[0];
  if (petaColor) {
    return `rgb(${petaColor.r}, ${petaColor.g}, ${petaColor.b})`;
  }
  return "#ffffff";
});
const fetchPetaTags = (() => {
  let fetchId = 0;
  return async () => {
    const currentFetchId = ++fetchId;
    if (!settingsStore.state.value.showTagsOnTile) {
      return;
    }
    if (props.tile.petaImage === undefined) {
      return;
    }
    const result = await IPC.send("getPetaTagIdsByPetaImageIds", [props.tile.petaImage.id]);
    if (currentFetchId !== fetchId) {
      return;
    }
    myPetaTags.value = petaTagsStore.state.petaTags.value.filter((petaTag) =>
      result.find((id) => id === petaTag.id),
    );
    loadingTags.value = false;
  };
})();
function delayedFetchPetaTags() {
  window.clearTimeout(fetchTagsTimeoutHandler);
  fetchingPetaTags.value = true;
  fetchTagsTimeoutHandler = window.setTimeout(() => {
    if (props.tile.visible) {
      fetchPetaTags();
    }
    fetchingPetaTags.value = false;
  }, Math.random() * BROWSER_FETCH_TAGS_DELAY_RANDOM + BROWSER_FETCH_TAGS_DELAY);
}
function delayedLoadImage() {
  window.clearTimeout(loadOriginalTimeoutHandler);
  thumbnailURL.value = getImageURL(props.tile.petaImage, ImageType.THUMBNAIL);
  if (props.original) {
    loadOriginalTimeoutHandler = window.setTimeout(() => {
      if (props.tile.visible) {
        const img = image.value;
        const url = getImageURL(props.tile.petaImage, ImageType.ORIGINAL);
        if (img === undefined) {
          return;
        }
        if (img.src !== url) {
          loadingOriginal.value = true;
          ImageDecoder.decode(img, url, (failed) => {
            loadingOriginal.value = failed;
          });
        }
      }
    }, Math.random() * BROWSER_LOAD_ORIGINAL_DELAY_RANDOM + BROWSER_LOAD_ORIGINAL_DELAY);
  }
}
const selected = computed(() => {
  if (props.tile.petaImage !== undefined) {
    return petaImagesStore.getSelected(props.tile.petaImage);
  }
  return false;
});
watch([() => props.tile.visible, () => props.original], () => {
  delayedLoadImage();
});
watch([() => props.tile.visible, () => settingsStore.state.value.showTagsOnTile], () => {
  delayedFetchPetaTags();
});
petaTagsStore.onUpdate((petaTagIds, petaImageIds) => {
  if (
    petaImageIds.find((id) => id === props.tile.petaImage?.id) ||
    petaTagIds.find((id) => myPetaTags.value.find((petaTag) => petaTag.id === id)) ||
    fetchingPetaTags.value
  ) {
    delayedFetchPetaTags();
  }
});
</script>

<style lang="scss" scoped>
t-tile-root {
  display: block;
  position: absolute;
  > t-group {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
    display: block;
    text-align: center;
    line-height: 24px;
    font-weight: bold;
    font-size: var(--size-2);
  }
  > t-tile-wrapper {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
    border-radius: var(--rounded);
    display: block;
    > t-images {
      display: block;
      width: 100%;
      height: 100%;
      cursor: pointer;
      filter: brightness(0.7);
      position: relative;
      &.selected {
        filter: brightness(1);
        border-radius: var(--rounded);
        padding: 2px;
      }
      > img {
        z-index: 1;
        position: absolute;
        top: 0px;
        left: 0px;
        display: block;
        width: 100%;
        height: 100%;
      }
      > t-background {
        z-index: 0;
        position: absolute;
        top: 0px;
        left: 0px;
        display: block;
        width: 100%;
        height: 100%;
        background-repeat: repeat;
        background-image: url("~@/@assets/transparentBackground.png");
      }
      > t-placeholder {
        position: absolute;
        z-index: 2;
        top: 0px;
        left: 0px;
        display: block;
        width: 100%;
        height: 100%;
        opacity: 1;
        transition: opacity 200ms ease-in-out;
        background-color: unset;
        &.loaded {
          opacity: 0;
        }
      }
      > t-nsfw {
        z-index: 2;
        position: absolute;
        top: 0px;
        left: 0px;
        width: 100%;
        height: 100%;
        display: block;
        background-size: 32px;
        background-position: center;
        background-repeat: repeat;
        background-image: url("~@/@assets/nsfwBackground.png");
      }
    }
    &:hover {
      box-shadow: 1px 1px 5px rgba(0, 0, 0, 0.5);
      > t-images {
        filter: brightness(1);
      }
    }
    > t-tags {
      width: 100%;
      position: absolute;
      bottom: 0px;
      pointer-events: none;
      outline: none;
      padding: 2px;
      font-size: var(--size-0);
      word-break: break-word;
      text-align: left;
      display: flex;
      flex-direction: row;
      flex-wrap: wrap-reverse;
      justify-content: right;
      > t-tag {
        display: inline-block;
        margin: 1px 1px;
        border-radius: var(--rounded);
        padding: var(--px-1);
        background-color: var(--color-1);
        font-size: var(--size-0);
        line-height: var(--size-0);
        font-weight: bold;
        // border: solid 2px var(--color-font);
      }
      &.selected {
        padding: var(--px-2);
      }
    }
    > t-selected {
      position: absolute;
      bottom: 0px;
      right: 0px;
      pointer-events: none;
      border-radius: var(--rounded);
      width: 100%;
      height: 100%;
      box-shadow: var(--shadow) inset;
      display: block;
      &:before {
        content: "";
        position: absolute;
        width: 100%;
        height: 100%;
        border-radius: var(--rounded);
        border: solid calc(var(--px-1)) var(--color-0);
        box-shadow: 0px 0px 0px calc(var(--px-1) * 0.5 - 0.4px) var(--color-font) inset;
      }
      &:after {
        content: "";
        position: absolute;
        width: 100%;
        height: 100%;
        border-radius: var(--rounded);
        border: solid calc(var(--px-1) * 0.5) var(--color-font);
      }
    }
  }
}
</style>
