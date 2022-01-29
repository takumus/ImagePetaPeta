<template>
  <article
    class="thumbnail-root"
    :style="{
      top: browserThumbnail.position.y + 'px',
      left: browserThumbnail.position.x + 'px',
      width: this.browserThumbnail.width + 'px',
      height: this.browserThumbnail.height + 'px'
    }"
  >
    <div class="wrapper">
      <img
        draggable="false"
        :src="imageURL"
        v-if="loaded"
      >
    </div>
  </article>
</template>

<script lang="ts">
// Vue
import { Options, Vue } from "vue-class-component";
import { Prop, Ref, Watch } from "vue-property-decorator";
// Others
import { ImageLoader } from "@/imageLoader";
import { BrowserThumbnail } from "@/datas/browserThumbnail";
import { ImageType } from "@/datas/imageType";
@Options({
  components: {
  }
})
export default class VPropertyThumbnail extends Vue {
  @Prop()
  browserThumbnail!: BrowserThumbnail;
  imageURL = "";
  mounted() {
    this.imageURL = ImageLoader.getImageURL(this.browserThumbnail.petaImage, ImageType.THUMBNAIL);
  }
  get loaded() {
    return this.imageURL != "";
  }
}
</script>

<style lang="scss" scoped>
.thumbnail-root {
  display: block;
  position: absolute;
  >.wrapper {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
    >img {
      display: block;
      width: 100%;
      height: 100%;
    }
  }
}
</style>