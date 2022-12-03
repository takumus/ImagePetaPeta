<template>
  <t-property-thumbnail-root
    :style="{
      top: propertyThumbnail.position.y + 'px',
      left: propertyThumbnail.position.x + 'px',
      width: propertyThumbnail.width + 'px',
      height: propertyThumbnail.height + 'px',
    }">
    <t-image-wrapper>
      <t-nsfw v-if="nsfwMask"> </t-nsfw>
      <img draggable="false" :src="fileURL" v-if="!nsfwMask && fileURL !== undefined" />
    </t-image-wrapper>
  </t-property-thumbnail-root>
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
t-property-thumbnail-root {
  display: block;
  position: absolute;
  > t-image-wrapper {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
    border-radius: var(--rounded);
    background-repeat: repeat;
    background-image: url("~@/@assets/transparentBackground.png");
    display: block;
    > img {
      display: block;
      width: 100%;
      height: 100%;
      position: relative;
      top: 0px;
      left: 0px;
    }
    > t-nsfw {
      position: relative;
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
}
</style>
