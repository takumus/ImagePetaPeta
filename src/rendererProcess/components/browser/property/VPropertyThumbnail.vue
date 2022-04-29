<template>
  <t-property-thumbnail-root
    :style="{
      top: propertyThumbnail.position.y + 'px',
      left: propertyThumbnail.position.x + 'px',
      width: this.propertyThumbnail.width + 'px',
      height: this.propertyThumbnail.height + 'px'
    }"
  >
    <t-image-wrapper>
      <img
        draggable="false"
        :src="imageURL"
        v-if="loaded"
      >
    </t-image-wrapper>
  </t-property-thumbnail-root>
</template>

<script lang="ts">
// Vue
import { Options, Vue } from "vue-class-component";
import { Prop, Ref, Watch } from "vue-property-decorator";
// Others
import { getImageURL } from "@/rendererProcess/utils/imageURL";
import { ImageType } from "@/commons/datas/imageType";
import { PropertyThumbnail } from "./propertyThumbnail";
@Options({
  components: {
  }
})
export default class VPropertyThumbnail extends Vue {
  @Prop()
  propertyThumbnail!: PropertyThumbnail;
  imageURL = "";
  mounted() {
    this.imageURL = getImageURL(this.propertyThumbnail.petaImage, ImageType.THUMBNAIL);
  }
  get loaded() {
    return this.imageURL != "";
  }
}
</script>

<style lang="scss" scoped>
t-property-thumbnail-root {
  display: block;
  position: absolute;
  >t-image-wrapper {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
    border-radius: var(--rounded);
    background-repeat: repeat;
    background-image: url("~@/@assets/transparentBackground.png");
    display: block;
    >img {
      display: block;
      width: 100%;
      height: 100%;
    }
  }
}
</style>