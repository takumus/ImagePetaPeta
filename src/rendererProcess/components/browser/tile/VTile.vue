<template>
  <article
    class="thumbnail-root"
    :style="{
      transform: `translate(${tile.position.x + 'px'}, ${tile.position.y + 'px'})`,
      width: tile.width + 'px',
      height: tile.height + 'px'
    }"
  >
    <div class="wrapper">
      <div
        class="img"
        @mousedown="mousedown($event)"
        :class="{
          'selected-image': tile.petaImage._selected
        }"
      >
        <div class="nsfw" v-if="showNsfw">
          NSFW
        </div>
        <canvas
          ref="canvas"
          class="placeholder"
          :class="{
            loaded: !loading
          }"
        ></canvas>
        <img
          draggable="false"
          :src="imageURL"
          v-show="!loading"
          loading="lazy"
          @load="loaded"
          class="image"
        >
        <section
          class="transparent-background"
        >
        </section>
      </div>
      <div class="info">
        <span
          class="tags"
          v-for="petaTag in myPetaTags"
          :key="petaTag.id"
        >
          {{petaTag.name}}
        </span>
        <span
          class="tags"
          v-if="myPetaTags.length == 0"
        >
          {{$t("browser.untagged")}}
        </span>
      </div>
      <div
        class="selected"
        v-show="tile.petaImage._selected"
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
import { Vec2, vec2FromMouseEvent } from "@/commons/utils/vec2";
import { getImageURL } from "@/rendererProcess/utils/imageURL";
import { Tile } from "@/rendererProcess/components/browser/tile/tile";
import { MouseButton } from "@/commons/datas/mouseButton";
import { ClickChecker } from "@/rendererProcess/utils/clickChecker";
import { ImageType } from "@/commons/datas/imageType";
import { decode as decodePlaceholder } from "blurhash";
import { log } from "@/rendererProcess/api";
import { PetaTag } from "@/commons/datas/petaTag";
import TransparentBackground from "@/@assets/transparentBackground.png";
@Options({
  components: {
  },
  emits: ["select", "add", "menu"]
})
export default class VTile extends Vue {
  @Prop()
  tile!: Tile;
  @Prop()
  original = false;
  @Prop()
  petaTags!: PetaTag[];
  @Ref("canvas")
  canvas!: HTMLCanvasElement;
  imageURL = "";
  pressing = false;
  loading = true;
  click: ClickChecker = new ClickChecker();
  mounted() {
    if (this.tile.petaImage.placeholder != "") {
      try {
        const pixels = decodePlaceholder(this.tile.petaImage.placeholder, 8, 8);
        this.canvas.width = 8;
        this.canvas.height = 8;
        const ctx = this.canvas.getContext("2d");
        if (ctx){ 
          const imageData = ctx.createImageData(8, 8);
          imageData.data.set(pixels);
          ctx.putImageData(imageData, 0, 0);
        }
      } catch(e) {
        log("vTile", "blurhash error:", e);
      }
    }
    this.changeVisible();
  }
  unmounted() {
    window.removeEventListener("mousemove", this.mousemove);
    window.removeEventListener("mouseup", this.mouseup);
  }
  mousedown(event: MouseEvent) {
    this.click.down(new Vec2(event.clientX, event.clientY));
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
    this.click.move(new Vec2(event.clientX, event.clientY));
    if (!this.click.isClick) {
      const img = (event as Event).target as HTMLElement;
      const elementRect = img.getBoundingClientRect();
      const position = new Vec2(
        elementRect.x + elementRect.width / 2,
        elementRect.y + elementRect.height / 2
      );
      this.$emit("add", this.tile, vec2FromMouseEvent(event), position);
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
          this.$emit("select", this.tile);
          break;
        case MouseButton.RIGHT:
          this.$emit("menu", this.tile, vec2FromMouseEvent(event));
          break;
      }
    }
  }
  loaded() {
    this.loading = false;
  }
  get showNsfw() {
    return this.tile.petaImage.nsfw && !this.$settings.showNsfwWithoutConfirm;
  }
  get myPetaTags() {
    return this.petaTags.filter((petaTag) => {
      return petaTag.petaImages.includes(this.tile.petaImage.id);
    });
  }
  get transparentBackground() {
    return TransparentBackground;
  }
  @Watch("original")
  changeOriginal() {
    if (this.original) {
      this.imageURL = getImageURL(this.tile.petaImage, ImageType.ORIGINAL);
    } else {
      this.imageURL = getImageURL(this.tile.petaImage, ImageType.THUMBNAIL);
    }
  }
  @Watch("tile.visible")
  changeVisible() {
    if (this.tile.visible) {
      this.changeOriginal();
    }
  }
}
</script>

<style lang="scss" scoped>
.thumbnail-root {
  display: block;
  position: absolute;
  padding-right: 8px;
  padding-top: 8px;
  >.wrapper {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
    border-radius: var(--rounded);
    transition: box-shadow 100ms ease-in-out;
    >.img {
      display: block;
      width: 100%;
      height: 100%;
      cursor: pointer;
      filter: brightness(0.7);
      transition: filter 100ms ease-in-out;
      // background-color: #ffffff;
      &.selected-image {
        filter: brightness(1.0);
        border-radius: var(--rounded);
        padding: 2px;
      }
      >.image {
        z-index: 1;
        position: absolute;
        top: 0px;
        left: 0px;
        display: block;
        width: 100%;
        height: 100%;
      }
      >.transparent-background {
        z-index: 0;
        position: absolute;
        top: 0px;
        left: 0px;
        display: block;
        width: 100%;
        height: 100%;
        background-repeat: repeat;
        background-image: url("~@/@assets/transparentBackground.png");
      }
      >.placeholder {
        position: relative;
        z-index: 2;
        top: 0px;
        left: 0px;
        display: block;
        width: 100%;
        height: 100%;
        opacity: 1;
        transition: opacity 200ms ease-in-out;
        &.loaded {
          opacity: 0;
        }
      }
      >.nsfw {
        z-index: 2;
        position: relative;
        top: 0px;
        left: 0px;
        width: 100%;
        height: 100%;
        background-color: #ffffff;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        color: #666666;
        font-weight: bold;
      }
    }
    &:hover {
      box-shadow: 1px 1px 5px rgba($color: #000000, $alpha: 0.5);
      >.img {
        filter: brightness(1);
      }
    }
    >.info {
      width: 100%;
      position: absolute;
      bottom: 0px;
      pointer-events: none;
      overflow-wrap: break-word;
      padding: 8px;
      line-height: 1.2em;
      >.tags {
        background-color: rgba($color: (#000000), $alpha: 0.5);
        color: #ffffff;
        padding: 2px;
        border-radius: var(--rounded);
        margin-right: 4px;
        font-size: 0.8em;
      }
    }
    >.selected {
      position: absolute;
      bottom: 0px;
      right: 0px;
      pointer-events: none;
      border-radius: var(--rounded);
      width: 100%;
      height: 100%;
      // background-color: rgba($color: #ffffff, $alpha: 0.4);
      border: solid 4px var(--font-color);
      >.checkbox {
        border-radius: var(--rounded) 0px 0px 0px;
        background-color: var(--font-color);
        color: var(--bg-color);
        position: absolute;
        padding: 0px 6px;
        margin-right: -2px;
        margin-bottom: -2px;
        bottom: 0px;
        right: 0px;
      }
    }
  }
}
</style>