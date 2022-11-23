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
      <img draggable="false" :src="imageURL" v-if="!nsfwMask && imageURL !== undefined" />
    </t-image-wrapper>
  </t-property-thumbnail-root>
</template>

<script setup lang="ts">
// Vue
import { computed, onMounted, ref } from "vue";

import { ImageType } from "@/commons/datas/imageType";

import { PropertyThumbnail } from "@/renderer/components/commons/property/propertyThumbnail";
import { useNSFWStore } from "@/renderer/stores/nsfwStore/useNSFWStore";
// Others
import { getImageURL } from "@/renderer/utils/imageURL";

const nsfwStore = useNSFWStore();
const props = defineProps<{
  propertyThumbnail: PropertyThumbnail;
}>();
const imageURL = ref<string | undefined>(undefined);
onMounted(() => {
  imageURL.value = getImageURL(props.propertyThumbnail.petaImage, ImageType.THUMBNAIL);
});
const nsfwMask = computed(() => {
  return props.propertyThumbnail.petaImage.nsfw && !nsfwStore.state.value;
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
