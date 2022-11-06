<template>
  <t-details-root
    :style="{
      zIndex: zIndex,
    }"
  >
    <VDragView :contentWidth="petaImage.width" :contentHeight="petaImage.height">
      <img v-show="loaded" :src="url" draggable="false" @load="loaded = true" />
      <t-nsfw v-if="nsfwMask"></t-nsfw>
    </VDragView>
    <!-- 1pxだけ右下から出すとスムーズなズームが出来る。ブラウザの仕様。 -->
    <t-smooth>
      <img
        :src="url"
        draggable="false"
        :style="{
          width: petaImage.width + 'px',
          height: petaImage.height + 'px',
        }"
      />
    </t-smooth>
  </t-details-root>
</template>

<script setup lang="ts">
// Vue
import { ImageType } from "@/commons/datas/imageType";
import { PetaImage } from "@/commons/datas/petaImage";
import VDragView from "@/rendererProcess/components/utils/VDragView.vue";
import { useNSFWStore } from "@/rendererProcess/stores/nsfwStore";
import { getImageURL } from "@/rendererProcess/utils/imageURL";
import { ref, watch, computed } from "vue";
// Components
const props = defineProps<{
  petaImage: PetaImage;
  zIndex: number;
}>();
const nsfwStore = useNSFWStore();
const loaded = ref(false);
const url = computed(() => {
  return getImageURL(props.petaImage, ImageType.ORIGINAL);
});
const nsfwMask = computed(() => {
  return props.petaImage.nsfw && !nsfwStore.state.value;
});
watch(
  () => props.petaImage,
  () => {
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

  img,
  t-nsfw {
    width: 100%;
    height: 100%;
    position: absolute;
    top: 0px;
    left: 0px;
  }
  t-nsfw {
    background-size: 32px;
    background-position: center;
    background-repeat: repeat;
    background-image: url("~@/@assets/nsfwBackground.png");
  }
  // 1pxだけ右下から出す。
  > t-smooth {
    display: block;
    position: absolute;
    top: calc(100% - 1px);
    left: calc(100% - 1px);
    width: 1px;
    height: 1px;
    opacity: 0.1%;
  }
}
</style>
