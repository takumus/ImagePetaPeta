<template>
  <e-image-buttons-root ref="root">
    <e-image-button
      v-for="button in buttons"
      :style="{
        left: button.rect.x + 'px',
        top: button.rect.y + 'px',
        width: button.rect.width + 'px',
        height: button.rect.height + 'px',
      }"
      @click="emit('save', button.url)"
      :class="{
        [imgInfo[button.url]?.saveState!]: true,
      }">
      <e-size>
        {{ imgInfo[button.url]?.type }}({{ imgInfo[button.url]?.width }}x{{
          imgInfo[button.url]?.height
        }})
      </e-size>
      <e-img-wrapper>
        <img
          :src="button.url"
          v-show="imgInfo[button.url]?.loaded"
          @load="setImageInfo($event.target as HTMLImageElement)" />
      </e-img-wrapper>
    </e-image-button>
  </e-image-buttons-root>
</template>
<script setup lang="ts">
import { ImageInfo } from "$/@types/imageInfo";
import { getImageExtension } from "$/contents/ui/getImageExtension";
import { computed, onMounted, ref } from "vue";

const props = defineProps<{
  urls: string[];
  imgInfo: { [url: string]: ImageInfo | undefined };
}>();
const emit = defineEmits<{
  (e: "save", url: string): void;
  (e: "updateLoadedImageInfo", element: HTMLImageElement): void;
}>();
const root = ref<HTMLElement>();
const rect = ref({ x: 0, y: 0, height: 0, width: 0 });
onMounted(() => {
  if (root.value) {
    rect.value = root.value.getBoundingClientRect();
    new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (r) {
        rect.value = r;
      }
    }).observe(root.value);
  }
});
const buttons = computed(() => {
  const ws = Math.min(props.urls.length, 3);
  const size = Math.min(Math.min(rect.value.width) / ws, rect.value.height);
  return props.urls.map((url, i) => {
    const y = Math.floor(i / ws);
    const x = i % ws;
    return {
      url,
      rect: {
        x: x * size,
        y: y * size,
        width: size,
        height: size,
      },
    };
  });
});
function setImageInfo(element: HTMLImageElement) {
  const info = props.imgInfo[element.src];
  if (info !== undefined) {
    Object.assign<ImageInfo, Partial<ImageInfo>>(info, {
      width: element.naturalWidth,
      height: element.naturalHeight,
      loaded: true,
      type: getImageExtension(element.src) ?? "unknown",
    });
  }
}
</script>
<style lang="scss">
e-image-buttons-root {
  display: flex;
  position: relative;
  flex: 1;
  flex-direction: column;
  gap: var(--px-2);
  padding-right: var(--px-2);
  width: 100%;
  height: 100%;
  overflow: hidden;
  overflow-y: auto;
  &,
  * {
    pointer-events: auto !important;
  }
  > e-image-button {
    display: flex;
    position: absolute;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: var(--px-2);
    border-radius: var(--rounded);
    padding: var(--px-2);
    width: 100%;
    font-weight: bold;
    &,
    * {
      cursor: pointer;
    }
    > e-size {
      color: var(--color-font);
    }
    &:hover {
      background-color: var(--color-2);
    }
    &:active {
      background-color: var(--color-accent-1);
    }
    &.saved {
      opacity: 0.5;
    }
    > e-img-wrapper {
      display: block;
      flex: 1;
      width: 100%;
      overflow: hidden;
      > img {
        display: block;
        border-radius: var(--rounded);
        background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAADNJREFUOI1jvHz58n8GPEBHRwefNAMTXlkiwKgBg8EAxv///+NNB1euXKGtC0YNGAwGAAAfVwqTIQ+HUgAAAABJRU5ErkJggg==);
        width: 100%;
        height: 100%;
        overflow: hidden;
        object-fit: contain;
        pointer-events: none;
      }
    }
  }
}
</style>
