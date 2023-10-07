<template>
  <e-property-thumbnail-root
    :style="{
      top: propertyThumbnail.position.y + 'px',
      left: propertyThumbnail.position.x + 'px',
      width: propertyThumbnail.width + 'px',
      height: propertyThumbnail.height + 'px',
    }">
    <e-image-wrapper>
      <e-nsfw v-if="nsfwMask"> </e-nsfw>
      <img draggable="false" :src="fileURL" v-if="!nsfwMask && fileURL !== undefined" />
    </e-image-wrapper>
  </e-property-thumbnail-root>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";

import { FileType } from "@/commons/datas/fileType";

import { PropertyThumbnail } from "@/renderer/components/commons/property/propertyThumbnail";
import { useNSFWStore } from "@/renderer/stores/nsfwStore/useNSFWStore";
import { getFileURL } from "@/renderer/utils/fileURL";

const nsfwStore = useNSFWStore();
const props = defineProps<{
  propertyThumbnail: PropertyThumbnail;
}>();
const fileURL = ref<string | undefined>(undefined);
onMounted(() => {
  fileURL.value = getFileURL(props.propertyThumbnail.petaFile, FileType.THUMBNAIL);
});
const nsfwMask = computed(() => {
  return props.propertyThumbnail.petaFile.nsfw && !nsfwStore.state.value;
});
</script>

<style lang="scss" scoped>
e-property-thumbnail-root {
  display: block;
  position: absolute;
  > e-image-wrapper {
    display: block;
    position: relative;
    border-radius: var(--rounded);
    background-image: url("/images/textures/transparent.png");
    background-repeat: repeat;
    width: 100%;
    height: 100%;
    overflow: hidden;
    > img {
      display: block;
      position: relative;
      top: 0px;
      left: 0px;
      width: 100%;
      height: 100%;
    }
    > e-nsfw {
      display: block;
      position: relative;
      top: 0px;
      left: 0px;
      background-image: url("/images/textures/nsfw.png");
      background-position: center;
      background-size: 32px;
      background-repeat: repeat;
      width: 100%;
      height: 100%;
    }
  }
}
</style>
