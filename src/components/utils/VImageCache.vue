<template>
  <article
    class="image-cache"
    ref="imageCache"
    :style="{ zIndex: zIndex }"
  >
    <img
      v-for="url in cacheURLs"
      :key="url"
      :src="url"
    >
  </article>
</template>

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
  @Prop()
  zIndex = 0;
  @Ref("imageCache")
  imageCache!: HTMLDivElement;
  cacheURLs: string[] = [];
  async mounted() {
    ImageLoader.onUpdateFullsizedCache((c) => {
      if (!this.$settings.lowMemoryMode) {
        this.cacheURLs = c.cache.map((c) => c.url);
      }
    });
  }
}
</script>

<style lang="scss" scoped>
.image-cache {
  position: fixed;
  pointer-events: none;
  img {
    position: fixed;
    bottom: -99999px;
    right: -99999px;
    width: 100000px;
    height: 100000px;
    opacity: 0.1;
    pointer-events: none;
  }
}
</style>