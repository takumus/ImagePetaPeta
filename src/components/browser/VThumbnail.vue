<template>
  <article
    class="thumbnail-root"
    :style="{
      transform: `translate(${browserThumbnail.position.x + 'px'}, ${browserThumbnail.position.y + 'px'})`,
      width: browserThumbnail.width + 'px',
      height: browserThumbnail.height + 'px'
    }"
  >
    <div class="wrapper">
      <img
        draggable="false"
        :src="imageURL"
        @mousedown="mousedown($event)"
        v-if="loaded"
        :class="{
          'selected-image': browserThumbnail.petaImage._selected
        }"
      >
      <div class="info">
        <span
          class="tags"
          v-for="k in browserThumbnail.petaImage.tags"
          :key="k"
        >
          {{k}}
        </span>
        <span
          class="tags"
          v-if="browserThumbnail.petaImage.tags.length == 0"
        >
          {{$t("browser.untagged")}}
        </span>
      </div>
      <div
        class="selected"
        v-show="browserThumbnail.petaImage._selected"
      >
        <div class="checkbox">
          ✔
        </div>
      </div>
    </div>
  </article>
</template>

<script lang="ts">
// Vue
import { Options, Vue } from "vue-class-component";
import { Prop, Ref, Watch } from "vue-property-decorator";
// Others
import { Vec2, vec2FromMouseEvent } from "@/utils/vec2";
import { ImageLoader } from "@/imageLoader";
import { BrowserThumbnail } from "@/datas/browserThumbnail";
import { MouseButton } from "@/datas/mouseButton";
import { ClickChecker } from "@/utils/clickChecker";
import { ImageType } from "@/datas/imageType";
// import { API } from "@/api";
@Options({
  components: {
  },
  emits: ["select", "add", "menu"]
})
export default class VThumbnail extends Vue {
  @Prop()
  browserThumbnail!: BrowserThumbnail;
  imageURL = "";
  pressing = false;
  click: ClickChecker = new ClickChecker();
  mounted() {
    this.imageURL = ImageLoader.getImageURL(this.browserThumbnail.petaImage, ImageType.THUMBNAIL);
  }
  unmounted() {
    window.removeEventListener("mousemove", this.mousemove);
    window.removeEventListener("mouseup", this.mouseup);
  }
  mousedown(event: MouseEvent) {
    this.click.down(event);
    window.addEventListener("mousemove", this.mousemove);
    window.addEventListener("mouseup", this.mouseup);
    switch (event.button) {
      case MouseButton.LEFT: {
        this.pressing = true;
        break;
      }
    }
  }
  mousemove(event: MouseEvent) {
    if (!this.pressing) return;
    this.click.move(event);
    if (!this.click.isClick) {
      const img = (event as Event).target as HTMLElement;
      const elementRect = img.getBoundingClientRect();
      const position = new Vec2(
        elementRect.x + elementRect.width / 2,
        elementRect.y + elementRect.height / 2
      );
      this.$emit("add", this.browserThumbnail, vec2FromMouseEvent(event), position);
      this.pressing = false;
    }
  }
  mouseup(event: MouseEvent) {
    window.removeEventListener("mousemove", this.mousemove);
    window.removeEventListener("mouseup", this.mouseup);
    this.pressing = false;
    if (this.click.isClick) {
      switch(event.button) {
        case MouseButton.LEFT:
          this.$emit("select", this.browserThumbnail);
          break;
        case MouseButton.RIGHT:
          this.$emit("menu", this.browserThumbnail, vec2FromMouseEvent(event));
          break;
      }
    }
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
  padding-right: 8px;
  padding-top: 8px;
  .wrapper {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
    border-radius: var(--rounded);
    img {
      display: block;
      width: 100%;
      height: 100%;
      cursor: pointer;
      filter: brightness(0.7);
      // background-color: #ffffff;
      &.selected-image {
        filter: brightness(1.0);
        border-radius: var(--rounded);
        padding: 2px;
      }
    }
    &:hover {
      box-shadow: 1px 1px 5px rgba($color: #000000, $alpha: 0.5);
      img {
        filter: brightness(1);
      }
    }
  }
  .selected {
    position: absolute;
    bottom: 0px;
    right: 0px;
    pointer-events: none;
    border-radius: var(--rounded);
    width: 100%;
    height: 100%;
    background-color: rgba($color: #ffffff, $alpha: 0.4);
    border: solid 4px #222222;
    .checkbox {
      border-radius: var(--rounded) 0px 0px 0px;
      background-color: #222222;
      color: #ffffff;
      position: absolute;
      padding: 0px 6px;
      margin-right: -2px;
      margin-bottom: -2px;
      bottom: 0px;
      right: 0px;
    }
  }
  .info {
    width: 100%;
    position: absolute;
    bottom: 0px;
    pointer-events: none;
    word-break: break-word;
    padding: 8px;
    .tags {
      background-color: rgba($color: (#000000), $alpha: 0.5);
      color: #ffffff;
      padding: 2px;
      border-radius: var(--rounded);
      margin-right: 4px;
      font-size: 0.8em;
    }
  }
}
</style>