<template>
  <t-tile-root
    :style="{
      transform: `translate(${tile.position.x + 'px'}, ${tile.position.y + 'px'})`,
      width: tile.width + 'px',
      height: tile.height + 'px',
    }"
  >
    <t-tile-wrapper v-if="tile.group === undefined">
      <t-images
        @pointerdown="pointerdown($event)"
        @dragstart="dragstart($event)"
        @dblclick="dblclick"
        draggable="true"
        :class="{
          'selected-image': tile.petaImage?._selected,
        }"
      >
        <t-nsfw v-if="showNSFW"> </t-nsfw>
        <t-placeholder
          class="placeholder"
          :class="{
            loaded: !loadingImage,
          }"
          :style="{
            backgroundColor: placeholderColor,
          }"
        ></t-placeholder>
        <img draggable="false" :src="imageURL" v-show="!loadingImage" loading="lazy" @load="loaded" />
        <t-background> </t-background>
      </t-images>
      <t-tags v-if="settingsStore.state.value.showTagsOnTile">
        <t-tag v-for="petaTag in myPetaTags" :key="petaTag.id">
          {{ petaTag.name }}
        </t-tag>
        <t-tag v-if="myPetaTags.length === 0 && !loadingTags">
          {{ $t("browser.untagged") }}
        </t-tag>
      </t-tags>
      <t-selected v-show="tile.petaImage?._selected">
        <t-icon> ✔ </t-icon>
      </t-selected>
    </t-tile-wrapper>
    <t-group v-else>
      {{ tile.group }}
    </t-group>
  </t-tile-root>
</template>

<script setup lang="ts">
// Vue
import { computed, ref, watch, getCurrentInstance, onMounted, onUnmounted } from "vue";
// Others
import { Vec2, vec2FromPointerEvent } from "@/commons/utils/vec2";
import { getImageURL } from "@/rendererProcess/utils/imageURL";
import { Tile } from "@/rendererProcess/components/browser/tile/tile";
import { MouseButton } from "@/commons/datas/mouseButton";
import { ClickChecker } from "@/rendererProcess/utils/clickChecker";
import { ImageType } from "@/commons/datas/imageType";
import { API } from "@/rendererProcess/api";
import { PetaTag } from "@/commons/datas/petaTag";
import { PetaTagInfo } from "@/commons/datas/petaTagInfo";
import {
  BROWSER_FETCH_TAGS_DELAY,
  BROWSER_FETCH_TAGS_DELAY_RANDOM,
  BROWSER_LOAD_ORIGINAL_DELAY,
  BROWSER_LOAD_ORIGINAL_DELAY_RANDOM,
} from "@/commons/defines";
import { PetaImage } from "@/commons/datas/petaImage";
import { useNSFWStore } from "@/rendererProcess/stores/nsfwStore";
import { useSettingsStore } from "@/rendererProcess/stores/settingsStore";

const emit = defineEmits<{
  (e: "select", tile: Tile): void;
  (e: "menu", tile: Tile, position: Vec2): void;
  (e: "drag", petaImage: PetaImage): void;
  (e: "dblclick", petaImage: PetaImage): void;
}>();
const props = defineProps<{
  tile: Tile;
  original: boolean;
  petaTagInfos: PetaTagInfo[];
  parentAreaMinY: number;
  parentAreaMaxY: number;
}>();
const nsfwStore = useNSFWStore();
const settingsStore = useSettingsStore();
const _this = getCurrentInstance()!.proxy!;
const imageURL = ref("");
const loadingImage = ref(true);
const loadingTags = ref(true);
const loadedOriginal = ref(false);
const myPetaTags = ref<PetaTag[]>([]);
const click: ClickChecker = new ClickChecker();
let loadOriginalTimeoutHandler = -1;
let fetchTagsTimeoutHandler = -1;
let pressing = false;
onMounted(() => {
  updateContent(true);
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
function loaded() {
  loadingImage.value = false;
}
const showNSFW = computed(() => {
  if (props.tile.petaImage === undefined) {
    return false;
  }
  return props.tile.petaImage.nsfw && !nsfwStore.state.value;
});
const placeholderColor = computed(() => {
  if (props.tile.petaImage === undefined) {
    return "#ffffff";
  }
  const petaColor = props.tile.petaImage.palette[0];
  if (petaColor) {
    return `rgb(${petaColor.r}, ${petaColor.g}, ${petaColor.b})`;
  }
  return "#ffffff";
});
async function fetchPetaTags() {
  myPetaTags.value = [];
  if (!settingsStore.state.value.showTagsOnTile) {
    return;
  }
  if (props.tile.petaImage === undefined) {
    return;
  }
  const result = await API.send("getPetaTagIdsByPetaImageIds", [props.tile.petaImage.id]);
  myPetaTags.value = props.petaTagInfos
    .filter((petaTagInfo) => result.find((id) => id === petaTagInfo.petaTag.id))
    .map((pti) => pti.petaTag);
  loadingTags.value = false;
}
function updateContent(tags = false) {
  if (tags) {
    window.clearTimeout(fetchTagsTimeoutHandler);
  }
  window.clearTimeout(loadOriginalTimeoutHandler);
  if (props.tile.visible) {
    if (tags) {
      fetchTagsTimeoutHandler = window.setTimeout(() => {
        fetchPetaTags();
      }, Math.random() * BROWSER_FETCH_TAGS_DELAY_RANDOM + BROWSER_FETCH_TAGS_DELAY);
    }
    if (!loadedOriginal.value) {
      imageURL.value = getImageURL(props.tile.petaImage, ImageType.THUMBNAIL);
      if (props.original) {
        loadOriginalTimeoutHandler = window.setTimeout(() => {
          imageURL.value = getImageURL(props.tile.petaImage, ImageType.ORIGINAL);
          loadedOriginal.value = true;
        }, Math.random() * BROWSER_LOAD_ORIGINAL_DELAY_RANDOM + BROWSER_LOAD_ORIGINAL_DELAY);
      }
    }
  } else {
    loadedOriginal.value = false;
  }
}
const visible = computed(() => {
  return props.tile.visible;
});
watch([() => props.parentAreaMinY, () => props.parentAreaMaxY, () => props.original, () => props.tile.width], () => {
  updateContent();
});
watch([visible, () => props.petaTagInfos, () => settingsStore.state.value.showTagsOnTile], () => {
  updateContent(true);
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
      &.selected-image {
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
        background-color: #ffffff;
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
      padding: 2px 2px;
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
        padding: 3px;
        background-color: var(--color-sub);
        font-size: var(--size-0);
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
      // background-color: rgba($color: #ffffff, $alpha: 0.4);
      border: solid 4px var(--color-font);
      display: block;
      > t-icon {
        border-radius: var(--rounded) 0px 0px 0px;
        background-color: var(--color-font);
        color: var(--color-main);
        position: absolute;
        padding: 0px 6px;
        margin-right: -2px;
        margin-bottom: -2px;
        bottom: 0px;
        right: 0px;
        display: block;
      }
    }
  }
}
</style>
