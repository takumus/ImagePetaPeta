<template>
  <e-tile-root
    :style="{
      transform: `translate(${tile.position.x + 'px'}, ${tile.position.y + 'px'})`,
      width: tile.width + 'px',
      height: tile.height + 'px',
    }">
    <e-tile-wrapper
      v-if="tile.group === undefined && tile.petaFile !== undefined"
      @pointermove="seekVideo"
      @pointerenter="pointerEnter"
      @pointerleave="pointerLeave">
      <e-images
        @pointerdown="pointerdown"
        @dragstart="dragstart($event)"
        @dblclick="dblclick"
        draggable="true"
        :class="{
          selected,
        }">
        <e-nsfw v-if="nsfwMask"> </e-nsfw>
        <e-placeholder
          class="placeholder"
          :class="{
            loaded: !loadingThumbnail,
          }"
          :style="{
            backgroundColor: placeholderColor,
          }"></e-placeholder>
        <img
          draggable="false"
          :src="thumbnailURL"
          @load="loadingThumbnail = false"
          v-if="loadingOriginal"
          decoding="async" />
        <img
          ref="image"
          draggable="false"
          v-show="!loadingOriginal && tile.petaFile.metadata.type === 'image'" />
        <video
          ref="video"
          v-show="tile.petaFile.metadata.type === 'video'"
          v-if="showVideo"
          :src="getFileURL(props.tile.petaFile, FileType.ORIGINAL)"></video>
        <e-background> </e-background>
      </e-images>
      <e-inners
        :class="{
          selected,
        }">
        <e-tags v-if="settingsStore.state.value.showTagsOnTile">
          <e-tag v-for="petaTag in myPetaTags" :key="petaTag.id">
            {{ petaTag.name }}
          </e-tag>
          <e-tag v-if="myPetaTags.length === 0 && !loadingTags">
            {{ t("browser.untagged") }}
          </e-tag>
        </e-tags>
        <e-video-duration v-if="props.tile.petaFile?.metadata.type === 'video'">
          {{ videoDuration }}
        </e-video-duration>
        <e-secure v-if="props.tile.petaFile?.encrypted">
          <e-icon></e-icon>
        </e-secure>
      </e-inners>
      <e-selected v-show="selected"> </e-selected>
    </e-tile-wrapper>
    <e-group v-else>
      {{ tile.group }}
    </e-group>
  </e-tile-root>
</template>

<script setup lang="ts">
import { debounce } from "throttle-debounce";
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

import { FileType } from "@/commons/datas/fileType";
import { MouseButton } from "@/commons/datas/mouseButton";
import { RPetaFile } from "@/commons/datas/rPetaFile";
import { RPetaTag } from "@/commons/datas/rPetaTag";
import {
  BROWSER_FETCH_TAGS_DELAY,
  BROWSER_FETCH_TAGS_DELAY_RANDOM,
  BROWSER_LOAD_ORIGINAL_DELAY,
  BROWSER_LOAD_ORIGINAL_DELAY_RANDOM,
  BROWSER_LOAD_THUMBNAIL_DELAY,
  BROWSER_LOAD_THUMBNAIL_DELAY_RANDOM,
} from "@/commons/defines";
import { secondsToHMS } from "@/commons/utils/secondsToHMS";
import { Vec2, vec2FromPointerEvent } from "@/commons/utils/vec2";

import { Tile } from "@/renderer/components/browser/tile/tile";
import { ClickChecker } from "@/renderer/libs/clickChecker";
import { IPC } from "@/renderer/libs/ipc";
import * as ImageDecoder from "@/renderer/libs/serialImageDecoder";
import { useNSFWStore } from "@/renderer/stores/nsfwStore/useNSFWStore";
import { usePetaTagsStore } from "@/renderer/stores/petaTagsStore/usePetaTagsStore";
import { useSettingsStore } from "@/renderer/stores/settingsStore/useSettingsStore";
import { getFileURL } from "@/renderer/utils/fileURL";

const emit = defineEmits<{
  (e: "select", tile: Tile): void;
  (e: "menu", tile: Tile, position: Vec2): void;
  (e: "drag", petaFile: RPetaFile): void;
  (e: "dblclick", petaFile: RPetaFile): void;
}>();
const props = defineProps<{
  tile: Tile;
  original: boolean;
  parentAreaMinY: number;
  parentAreaMaxY: number;
}>();
const nsfwStore = useNSFWStore();
const settingsStore = useSettingsStore();
const petaTagsStore = usePetaTagsStore();
const { t } = useI18n();
const thumbnailURL = ref("");
const image = ref<HTMLImageElement>();
const video = ref<HTMLVideoElement>();
const loadingThumbnail = ref(true);
const loadingOriginal = ref(true);
const loadingTags = ref(true);
const myPetaTags = ref<RPetaTag[]>([]);
const click: ClickChecker = new ClickChecker();
const videoDuration = ref("00:00");
let loadOriginalTimeoutHandler = -1;
let loadThumbnailTimeoutHandler = -1;
let fetchTagsTimeoutHandler = -1;
const fetchingPetaTags = ref(false);
const showVideo = ref(false);
const setVideoVisibleDebounce = debounce(500, (visible: boolean) => {
  showVideo.value = visible;
});
onMounted(() => {
  delayedLoadImage();
  delayedFetchPetaTags();
  if (props.tile.petaFile?.metadata.type === "video") {
    videoDuration.value = secondsToHMS(props.tile.petaFile.metadata.duration);
  }
});
onUnmounted(() => {
  window.clearTimeout(loadOriginalTimeoutHandler);
  window.clearTimeout(loadThumbnailTimeoutHandler);
  window.clearTimeout(fetchTagsTimeoutHandler);
});
function pointerEnter() {
  showVideo.value = true;
  setVideoVisibleDebounce(true);
}
function pointerLeave() {
  setVideoVisibleDebounce(false);
}
function seekVideo(event: PointerEvent) {
  if (props.tile.petaFile?.metadata.type !== "video") {
    return;
  }
  const rect = (event.target as HTMLElement).getBoundingClientRect();
  const progress = event.offsetX / rect.width;
  if (
    video.value === undefined ||
    !video.value.seekable ||
    video.value.seeking ||
    video.value.readyState < 2
  ) {
    return;
  }
  video.value.currentTime = progress * video.value.duration;
}
function dragstart(event: PointerEvent) {
  event.preventDefault();
  if (props.tile.petaFile) {
    emit("drag", props.tile.petaFile);
  }
}
function pointerdown() {
  click.down();
  click.on("click", (event) => {
    switch (event.button) {
      case MouseButton.LEFT:
        emit("select", props.tile);
        break;
      case MouseButton.RIGHT:
        emit("menu", props.tile, vec2FromPointerEvent(event));
        break;
    }
  });
}
function dblclick() {
  if (props.tile.petaFile) {
    emit("dblclick", props.tile.petaFile);
  }
}
const nsfwMask = computed(() => {
  if (props.tile.petaFile === undefined) {
    return false;
  }
  return props.tile.petaFile.nsfw && !nsfwStore.state.value;
});
const placeholderColor = computed(() => {
  const petaColor = props.tile.petaFile?.metadata.palette[0];
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
    if (props.tile.petaFile === undefined) {
      return;
    }
    const result = await IPC.getPetaTagIdsByPetaFileIds([props.tile.petaFile.id]);
    if (currentFetchId !== fetchId) {
      return;
    }
    myPetaTags.value = petaTagsStore.state.petaTags.value
      .filter((petaTag) => result.find((id) => id === petaTag.id))
      .reverse();
    loadingTags.value = false;
  };
})();
function delayedFetchPetaTags() {
  window.clearTimeout(fetchTagsTimeoutHandler);
  fetchingPetaTags.value = true;
  fetchTagsTimeoutHandler = window.setTimeout(
    () => {
      if (props.tile.visible) {
        fetchPetaTags();
      }
      fetchingPetaTags.value = false;
    },
    Math.random() * BROWSER_FETCH_TAGS_DELAY_RANDOM + BROWSER_FETCH_TAGS_DELAY,
  );
}
function delayedLoadImage() {
  window.clearTimeout(loadOriginalTimeoutHandler);
  window.clearTimeout(loadThumbnailTimeoutHandler);
  loadThumbnailTimeoutHandler = window.setTimeout(
    () => {
      thumbnailURL.value = getFileURL(props.tile.petaFile, FileType.THUMBNAIL);
      if (props.original) {
        loadOriginalTimeoutHandler = window.setTimeout(
          () => {
            if (props.tile.visible) {
              if (props.tile.petaFile?.metadata.type === "image") {
                const img = image.value;
                const url = getFileURL(props.tile.petaFile, FileType.ORIGINAL);
                if (img === undefined) {
                  return;
                }
                if (img.src !== url) {
                  loadingOriginal.value = true;
                  ImageDecoder.decode(img, url, (failed) => {
                    loadingOriginal.value = failed;
                  });
                }
              } else if (props.tile.petaFile?.metadata.type === "video") {
                const v = video.value;
                if (v === undefined) {
                  return;
                }
                // v.src = getFileURL(props.tile.petaFile, FileType.ORIGINAL);
              }
            }
          },
          Math.random() * BROWSER_LOAD_ORIGINAL_DELAY_RANDOM + BROWSER_LOAD_ORIGINAL_DELAY,
        );
      }
    },
    Math.random() * BROWSER_LOAD_THUMBNAIL_DELAY_RANDOM + BROWSER_LOAD_THUMBNAIL_DELAY,
  );
}
const selected = computed(() => {
  if (props.tile.petaFile !== undefined) {
    return props.tile.petaFile.renderer.selected;
  }
  return false;
});
watch([() => props.tile.visible, () => props.original], () => {
  delayedLoadImage();
});
watch([() => props.tile.visible, () => settingsStore.state.value.showTagsOnTile], () => {
  delayedFetchPetaTags();
});
petaTagsStore.onUpdate((petaTagIds, petaFileIds) => {
  if (
    petaFileIds.find((id) => id === props.tile.petaFile?.id) ||
    petaTagIds.find((id) => myPetaTags.value.find((petaTag) => petaTag.id === id)) ||
    fetchingPetaTags.value
  ) {
    delayedFetchPetaTags();
  }
});
</script>

<style lang="scss" scoped>
e-tile-root {
  display: block;
  position: absolute;
  > e-group {
    display: block;
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
    font-weight: bold;
    font-size: var(--size-2);
    line-height: 24px;
    text-align: center;
  }
  > e-tile-wrapper {
    display: block;
    position: relative;
    border-radius: var(--rounded);
    width: 100%;
    height: 100%;
    overflow: hidden;
    > e-images {
      display: block;
      position: relative;
      filter: brightness(0.7);
      cursor: pointer;
      width: 100%;
      height: 100%;
      &.selected {
        filter: brightness(1);
        border-radius: var(--rounded);
        padding: 2px;
      }
      > img {
        display: block;
        position: absolute;
        top: 0px;
        left: 0px;
        z-index: 1;
        width: 100%;
        height: 100%;
      }
      > video {
        display: block;
        position: absolute;
        top: 0px;
        left: 0px;
        z-index: 1;
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      > e-background {
        display: block;
        position: absolute;
        top: 0px;
        left: 0px;
        z-index: 0;
        background-image: url("/images/textures/transparent.png");
        background-repeat: repeat;
        width: 100%;
        height: 100%;
      }
      > e-placeholder {
        display: block;
        position: absolute;
        top: 0px;
        left: 0px;
        opacity: 1;
        z-index: 2;
        // transition: opacity 200ms ease-in-out;
        background-color: unset;
        width: 100%;
        height: 100%;
        &.loaded {
          opacity: 0;
        }
      }
      > e-nsfw {
        display: block;
        position: absolute;
        top: 0px;
        left: 0px;
        z-index: 2;
        background-image: url("/images/textures/nsfw.png");
        background-position: center;
        background-size: 32px;
        background-repeat: repeat;
        width: 100%;
        height: 100%;
      }
    }
    &:hover {
      box-shadow: 1px 1px 5px rgba(0, 0, 0, 0.5);
      > e-images {
        filter: brightness(1);
      }
    }
    > e-inners {
      display: block;
      position: absolute;
      top: 0px;
      left: 0px;
      border: solid var(--px-1) transparent;
      width: 100%;
      height: 100%;
      pointer-events: none;
      &.selected {
        border: solid var(--px-2) transparent;
      }
      > e-video-duration {
        display: block;
        position: absolute;
        top: 0px;
        left: 0px;
        border-radius: var(--rounded);
        background-color: var(--color-1);
        padding: var(--px-0);
        font-size: var(--size-0);
        line-height: var(--size-0);
      }
      > e-secure {
        position: absolute;
        top: 0px;
        right: 0px;
        border-radius: var(--rounded);
        background-color: var(--color-1);
        width: var(--px-3);
        height: var(--px-3);
        > e-icon {
          display: block;
          filter: var(--filter-icon);
          background-image: url("/images/icons/locked.png");
          background-position: center;
          background-size: calc(var(--px-3) * 0.8);
          background-repeat: no-repeat;
          width: 100%;
          height: 100%;
        }
      }
      > e-tags {
        display: flex;
        position: absolute;
        bottom: 0px;
        flex-direction: row-reverse;
        flex-wrap: wrap-reverse;
        justify-content: right;
        outline: none;
        width: 100%;
        pointer-events: none;
        text-align: left;
        word-break: break-word;
        > e-tag {
          display: block;
          margin-top: var(--px-0);
          margin-left: var(--px-0);
          border-radius: var(--rounded);
          background-color: var(--color-1);
          padding: var(--px-0);
          font-size: var(--size-0);
        }
      }
    }
    > e-selected {
      display: block;
      position: absolute;
      right: 0px;
      bottom: 0px;
      box-shadow: var(--shadow) inset;
      border-radius: var(--rounded);
      width: 100%;
      height: 100%;
      pointer-events: none;
      &:before {
        position: absolute;
        box-shadow: 0px 0px 0px calc(var(--px-1) * 0.5 - 0.4px) var(--color-font) inset;
        border: solid calc(var(--px-1)) var(--color-0);
        border-radius: var(--rounded);
        width: 100%;
        height: 100%;
        content: "";
      }
      &:after {
        position: absolute;
        border: solid calc(var(--px-1) * 0.5) var(--color-font);
        border-radius: var(--rounded);
        width: 100%;
        height: 100%;
        content: "";
      }
    }
  }
}
</style>
