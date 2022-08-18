<template>
  <t-property-thumbnail-root
    :style="{
      top: propertyThumbnail.position.y + 'px',
      left: propertyThumbnail.position.x + 'px',
      width: propertyThumbnail.width + 'px',
      height: propertyThumbnail.height + 'px',
    }"
  >
    <t-image-wrapper>
      <t-nsfw v-if="showNSFW"> </t-nsfw>
      <img draggable="false" :src="imageURL" v-if="loaded" />
    </t-image-wrapper>
  </t-property-thumbnail-root>
</template>

<script setup lang="ts">
// Vue
import { computed, ref, onMounted, getCurrentInstance } from "vue";
// Others
import { getImageURL } from "@/rendererProcess/utils/imageURL";
import { ImageType } from "@/commons/datas/imageType";
import { PropertyThumbnail } from "./propertyThumbnail";
const _this = getCurrentInstance()!.proxy!;
const props = defineProps<{
  propertyThumbnail: PropertyThumbnail;
}>();
const imageURL = ref("");
onMounted(() => {
  imageURL.value = getImageURL(props.propertyThumbnail.petaImage, ImageType.THUMBNAIL);
});
const loaded = computed(() => {
  return imageURL.value != "";
});
const showNSFW = computed(() => {
  return props.propertyThumbnail.petaImage.nsfw && !_this.$nsfw.showNSFW;
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
      z-index: 1;
      top: 0px;
      left: 0px;
    }
    > t-nsfw {
      z-index: 2;
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
