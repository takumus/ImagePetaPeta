<template>
  <t-tile-root
    :style="{
      transform: `translate(${tile.position.x + 'px'}, ${tile.position.y + 'px'})`,
      width: tile.width + 'px',
      height: tile.height + 'px'
    }"
  >
    <t-tile-wrapper>
      <t-images
        @mousedown="mousedown($event)"
        @dragstart="dragstart($event)"
        draggable="true"
        :class="{
          'selected-image': tile.petaImage._selected
        }"
      >
        <t-nsfw v-if="showNsfw">
          NSFW
        </t-nsfw>
        <canvas
          ref="canvas"
          class="placeholder"
          :width="this.placeholderSize.width"
          :height="this.placeholderSize.height"
          :class="{
            loaded: !loadingImage
          }"
        ></canvas>
        <img
          draggable="false"
          :src="imageURL"
          v-show="!loadingImage"
          loading="lazy"
          @load="loaded"
        >
        <t-background
          class="transparent-background"
        >
        </t-background>
      </t-images>
      <t-tags>
        <t-tag
          v-for="petaTag in myPetaTags"
          :key="petaTag.id"
        >
          {{petaTag.name}}
        </t-tag>
        <t-tag
          v-if="myPetaTags.length == 0 && !loadingTags"
        >
          {{$t("browser.untagged")}}
        </t-tag>
      </t-tags>
      <t-selected
        v-show="tile.petaImage._selected"
      >
        <t-icon>
          ✔
        </t-icon>
      </t-selected>
    </t-tile-wrapper>
  </t-tile-root>
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
import { API } from "@/rendererProcess/api";
import { PetaTag } from "@/commons/datas/petaTag";
import { PetaTagInfo } from "@/commons/datas/petaTagInfo";
import { logChunk } from "@/rendererProcess/utils/rendererLogger";
import { BROWSER_FETCH_TAGS_DELAY, BROWSER_LOAD_ORIGINAL_DELAY, PLACEHOLDER_SIZE } from "@/commons/defines";
@Options({
  components: {
  },
  emits: ["select", "menu", "drag"]
})
export default class VTile extends Vue {
  @Prop()
  tile!: Tile;
  @Prop()
  original = false;
  @Prop()
  petaTagInfos!: PetaTagInfo[];
  @Ref("canvas")
  canvas!: HTMLCanvasElement;
  imageURL = "";
  pressing = false;
  loadingImage = true;
  loadingTags = true;
  click: ClickChecker = new ClickChecker();
  loadOriginalTimeoutHandler = -1;
  fetchTagsTimeoutHandler = -1;
  mounted() {
    if (this.tile.petaImage.placeholder != "") {
      try {
        const pixels = decodePlaceholder(this.tile.petaImage.placeholder, this.placeholderSize.width, this.placeholderSize.height);
        // this.canvas.width = width;
        // this.canvas.height = height;
        const ctx = this.canvas.getContext("2d");
        if (ctx){ 
          const imageData = ctx.createImageData(this.placeholderSize.width, this.placeholderSize.height);
          imageData.data.set(pixels);
          ctx.putImageData(imageData, 0, 0);
        }
      } catch(e) {
        logChunk().log("vTile", "blurhash error:", e);
      }
    }
    this.changeVisible();
  }
  get placeholderSize() {
    return {
      width: 8,
      height: Math.floor(this.tile.petaImage.height * 8)
    }
  }
  unmounted() {
    window.removeEventListener("mousemove", this.mousemove);
    window.removeEventListener("mouseup", this.mouseup);
    window.clearTimeout(this.loadOriginalTimeoutHandler);
    window.clearTimeout(this.fetchTagsTimeoutHandler);
  }
  dragstart(event: MouseEvent) {
    event.preventDefault();
    this.$emit("drag", this.tile.petaImage);
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
    // API.send("startDrag", this.tile.petaImage);
  }
  mousemove(event: MouseEvent) {
    if (!this.pressing) return;
    this.click.move(new Vec2(event.clientX, event.clientY));
    if (!this.click.isClick) {
      // const img = (event as Event).target as HTMLElement;
      // const elementRect = img.getBoundingClientRect();
      // const position = new Vec2(
      //   elementRect.x + elementRect.width / 2,
      //   elementRect.y + elementRect.height / 2
      // );
      // this.$emit("add", this.tile, vec2FromMouseEvent(event), position);
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
    this.loadingImage = false;
  }
  get showNsfw() {
    return this.tile.petaImage.nsfw && !this.$settings.showNsfwWithoutConfirm;
  }
  myPetaTags: PetaTag[] = [];
  async fetchPetaTags() {
    const result = await API.send("getPetaTagIdsByPetaImageIds", [this.tile.petaImage.id]);
    this.myPetaTags = this.petaTagInfos
    .filter((petaTagInfo) => result.find((id) => id == petaTagInfo.petaTag.id))
    .map((pti) => pti.petaTag);
    this.loadingTags = false;
  }
  @Watch("original")
  changeOriginal() {
    this.changeVisible();
  }
  @Watch("tile.visible")
  async changeVisible() {
    if (this.tile.visible) {
      this.fetchTagsTimeoutHandler = window.setTimeout(() => {
        this.fetchPetaTags();
      }, Math.random() * BROWSER_FETCH_TAGS_DELAY)
      this.imageURL = getImageURL(this.tile.petaImage, ImageType.THUMBNAIL);
      if (this.original) {
        this.loadOriginalTimeoutHandler = window.setTimeout(() => {
          this.imageURL = getImageURL(this.tile.petaImage, ImageType.ORIGINAL);
        }, BROWSER_LOAD_ORIGINAL_DELAY);
      }
    } else {
      window.clearTimeout(this.fetchTagsTimeoutHandler);
      window.clearTimeout(this.loadOriginalTimeoutHandler);
    }
  }
  @Watch("petaTagInfos")
  changeFetchTags() {
    this.fetchPetaTags();
  }
}
</script>

<style lang="scss" scoped>
t-tile-root {
  display: block;
  position: absolute;
  padding-right: 8px;
  padding-top: 8px;
  >t-tile-wrapper {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
    border-radius: var(--rounded);
    transition: box-shadow 100ms ease-in-out;
    display: block;
    >t-images {
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
      >img {
        z-index: 1;
        position: absolute;
        top: 0px;
        left: 0px;
        display: block;
        width: 100%;
        height: 100%;
      }
      >t-background {
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
        // filter: blur(20%);
        &.loaded {
          opacity: 0;
        }
      }
      >t-nsfw {
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
        display: block;
      }
    }
    &:hover {
      box-shadow: 1px 1px 5px rgba($color: #000000, $alpha: 0.5);
      v-images {
        filter: brightness(1.0);
      }
    }
    >t-tags {
      width: 100%;
      position: absolute;
      bottom: 0px;
      pointer-events: none;
      overflow-wrap: break-word;
      padding: 8px;
      line-height: 1.2em;
      display: block;
      >t-tag {
        background-color: rgba($color: (#000000), $alpha: 0.5);
        color: #ffffff;
        padding: 2px;
        border-radius: var(--rounded);
        margin-right: 4px;
        font-size: 0.8em;
        display: inline;
      }
    }
    >t-selected {
      position: absolute;
      bottom: 0px;
      right: 0px;
      pointer-events: none;
      border-radius: var(--rounded);
      width: 100%;
      height: 100%;
      // background-color: rgba($color: #ffffff, $alpha: 0.4);
      border: solid 4px var(--font-color);
      display: block;
      >t-icon {
        border-radius: var(--rounded) 0px 0px 0px;
        background-color: var(--font-color);
        color: var(--bg-color);
        position: absolute;
        padding: 0px 6px;
        margin-right: -2px;
        margin-bottom: -2px;
        bottom: 0px;
        right: 0px;
        display: block;
      }
    }
  }
}
</style>