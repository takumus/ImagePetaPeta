<template>
  <article
    class="thumbnail-root"
    :style="{ top: _y, left: _x, width: _width, height: _height }"
  >
    <div class="wrapper">
      <img
        draggable="false"
        :src="imageURL"
        v-if="_loaded"
      >
    </div>
  </article>
</template>

<style lang="scss" scoped>
.thumbnail-root {
  display: block;
  position: absolute;
  img {
    display: block;
    width: 100%;
    height: 100%;
  }
  .wrapper {
    position: relative;
    width: 100%;
    height: 100%;
    background-color: #2A2D2E;
    overflow: hidden;
  }
}
</style>

<script lang="ts">
// Vue
import { Options, Vue } from "vue-class-component";
import { Prop, Ref, Watch } from "vue-property-decorator";
// Others
import { PetaThumbnail } from "@/datas";
import { ImageLoader } from "@/imageLoader";
@Options({
  components: {
  }
})
export default class VPropertyThumbnail extends Vue {
  @Prop()
  petaThumbnail!: PetaThumbnail;
  imageURL = "";
  async mounted() {
    this.imageURL = await ImageLoader.getImageURL(this.petaThumbnail.petaImage, true);
    if (!(this.$el as HTMLElement).parentElement) {
      ImageLoader.removeImageURL(this.petaThumbnail.petaImage, true);
    }
  }
  unmounted() {
    ImageLoader.removeImageURL(this.petaThumbnail.petaImage, true);
  }
  get _x() {
    return this.petaThumbnail.position.x + "px";
  }
  get _y() {
    return this.petaThumbnail.position.y + "px";
  }
  get _width() {
    return this.petaThumbnail.width + "px";
  }
  get _height() {
    return this.petaThumbnail.height + "px";
  }
  get _loaded() {
    return this.imageURL != "";
  }
}
</script>
