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
        this.cacheURLs.splice(0, this.cacheURLs.length);
        c.forEach((u) => {
          this.cacheURLs.push(u);
        });
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
    bottom: -99990px;
    right: -99990px;
    width: 100000px;
    height: 100000px;
    opacity: 0.1;
    pointer-events: none;
  }
}
</style>