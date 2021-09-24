<template>
  <article
    class="image-cache"
    ref="imageCache"
  >
    <img v-for="url in cacheURLs" :key="url" :src="url">
  </article>
</template>

<style lang="scss" scoped>
.image-cache {
  position: fixed;
  pointer-events: none;
  z-index: 12345;
  img {
    position: fixed;
    bottom: -9999px;
    right: -9999px;
    width: 10000px;
    height: 10000px;
    opacity: 0.1;
    pointer-events: none;
  }
}
</style>

<script lang="ts">
// Vue
import { Options, Vue } from "vue-class-component";
import { Prop, Ref } from "vue-property-decorator";
// Others
import { ImageLoader } from "@/imageLoader";
@Options({
  components: {
  }
})
export default class VImageCache extends Vue {
  @Ref("imageCache")
  imageCache!: HTMLDivElement;
  cacheURLs: string[] = [];
  async mounted() {
    ImageLoader.onAddFullsizedImage((url) => {
      this.cacheURLs.push(url);
    });
  }
}
</script>
