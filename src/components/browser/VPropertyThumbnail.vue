<template>
  <article
    class="thumbnail-root"
    :style="{ top: petaThumbnail.position.y + 'px', left: petaThumbnail.position.x + 'px', width: this.petaThumbnail.width + 'px', height: this.petaThumbnail.height + 'px' }"
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
  get loaded() {
    return this.imageURL != "";
  }
}
</script>
