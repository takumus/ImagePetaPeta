<template>
  <t-tile-root
    :style="{
      transform: `translate(${tile.position.x + 'px'}, ${tile.position.y + 'px'})`,
      width: tile.width + 'px',
      height: tile.height + 'px'
    }"
  >
    <t-tile-wrapper v-if="tile.group === undefined">
      <t-images
        @pointerdown="pointerdown($event)"
        @dragstart="dragstart($event)"
        @dblclick="dblclick($event)"
        draggable="true"
        :class="{
          'selected-image': tile.petaImage._selected
        }"
      >
        <t-nsfw v-if="showNSFW">
        </t-nsfw>
        <t-placeholder
          class="placeholder"
          :class="{
            loaded: !loadingImage
          }"
          :style="{
            backgroundColor: placeholderColor
          }"
        ></t-placeholder>
        <img
          draggable="false"
          :src="imageURL"
          v-show="!loadingImage"
          
          loading="lazy"
          decoding="async"
          @load="loaded"
        >
        <t-background>
        </t-background>
      </t-images>
      <t-tags v-if="$settings.showTagsOnTile">
        <t-tag
          v-for="petaTag in myPetaTags"
          :key="petaTag.id"
        >
          {{petaTag.name}}
        </t-tag>
        <t-tag
          v-if="myPetaTags.length === 0 && !loadingTags"
        >
          {{$t("browser.untagged")}}
        </t-tag>
      </t-tags>
      <t-palette>
        <t-color-background>
          <t-color
            v-for="color in palette"
            :key="color.id"
            :style="{
              backgroundColor: color.color,
              flex: Math.floor(color.population * 80 + 20)
            }"
          >
          </t-color>
        </t-color-background>
      </t-palette>
      <t-selected
        v-show="tile.petaImage._selected"
      >
        <t-icon>
          ✔
        </t-icon>
      </t-selected>
    </t-tile-wrapper>
    <t-group v-else>
      {{tile.group}}
    </t-group>
  </t-tile-root>
</template>

<script lang="ts">
// Vue
import { Options, Vue } from "vue-class-component";
import { Prop, Ref, Watch } from "vue-property-decorator";
// Others
import { Vec2, vec2FromPointerEvent } from "@/commons/utils/vec2";
import { getImageURL } from "@/rendererProcess/utils/imageURL";
import { Tile } from "@/rendererProcess/components/browser/tile/tile";
import { MouseButton } from "@/commons/datas/mouseButton";
import { ClickChecker } from "@/rendererProcess/utils/clickChecker";
import { ImageType } from "@/commons/datas/imageType";
import { API } from "@/rendererProcess/api";
import { PetaTag } from "@/commons/datas/petaTag";
import { PetaTagInfo } from "@/commons/datas/petaTagInfo";
import { logChunk } from "@/rendererProcess/utils/rendererLogger";
import { BROWSER_FETCH_TAGS_DELAY, BROWSER_FETCH_TAGS_DELAY_RANDOM, BROWSER_LOAD_ORIGINAL_DELAY, BROWSER_LOAD_ORIGINAL_DELAY_RANDOM, PLACEHOLDER_SIZE } from "@/commons/defines";
@Options({
  components: {
  },
  emits: ["select", "menu", "drag", "dblclick"]
})
export default class VTile extends Vue {
  @Prop()
  tile!: Tile;
  @Prop()
  original = false;
  @Prop()
  petaTagInfos!: PetaTagInfo[];
  @Prop()
  parentAreaMinY!: number;
  @Prop()
  parentAreaMaxY!: number;
  imageURL = "";
  pressing = false;
  loadingImage = true;
  loadingTags = true;
  click: ClickChecker = new ClickChecker();
  loadOriginalTimeoutHandler = -1;
  fetchTagsTimeoutHandler = -1;
  loadedOriginal = false;
  mounted() {
    this.changeVisible();
  }
  unmounted() {
    window.removeEventListener("pointermove", this.pointermove);
    window.removeEventListener("pointerup", this.pointerup);
    window.clearTimeout(this.loadOriginalTimeoutHandler);
    window.clearTimeout(this.fetchTagsTimeoutHandler);
  }
  dragstart(event: PointerEvent) {
    event.preventDefault();
    this.$emit("drag", this.tile.petaImage);
  }
  pointerdown(event: PointerEvent) {
    this.click.down(new Vec2(event.clientX, event.clientY));
    window.addEventListener("pointermove", this.pointermove);
    window.addEventListener("pointerup", this.pointerup);
    switch (event.button) {
      case MouseButton.LEFT: {
        this.pressing = true;
        break;
      }
    }
    // API.send("startDrag", this.tile.petaImage);
  }
  pointermove(event: PointerEvent) {
    if (!this.pressing) return;
    this.click.move(new Vec2(event.clientX, event.clientY));
    if (!this.click.isClick) {
      // const img = (event as Event).target as HTMLElement;
      // const elementRect = img.getBoundingClientRect();
      // const position = new Vec2(
      //   elementRect.x + elementRect.width / 2,
      //   elementRect.y + elementRect.height / 2
      // );
      // this.$emit("add", this.tile, vec2FromPointerEvent(event), position);
      this.pressing = false;
    }
  }
  pointerup(event: PointerEvent) {
    console.log(event)
    window.removeEventListener("pointermove", this.pointermove);
    window.removeEventListener("pointerup", this.pointerup);
    this.pressing = false;
    if (this.click.isClick) {
      switch(event.button) {
        case MouseButton.LEFT:
          this.$emit("select", this.tile);
          break;
        case MouseButton.RIGHT:
          this.$emit("menu", this.tile, vec2FromPointerEvent(event));
          break;
      }
    }
  }
  dblclick(event: PointerEvent) {
    this.$emit("dblclick", this.tile.petaImage);
  }
  loaded() {
    this.loadingImage = false;
  }
  get showNSFW() {
    if (this.tile.petaImage === undefined) {
      return false;
    }
    return this.tile.petaImage.nsfw && !this.$nsfw.showNSFW;
  }
  get palette() {
    if (this.tile.petaImage === undefined) {
      return [];
    }
    const all = this.tile.petaImage.palette.reduce((p, c) => {
      return p + c.population;
    }, 0);
    return this.tile.petaImage.palette.map((color, i) => {
      return {
        color: `rgb(${color.r}, ${color.g}, ${color.b})`,
        population: color.population / all,
        id: i
      };
    })
    .sort((a, b) => {
      return b.population - a.population;
    });
  }
  get placeholderColor() {
    if (this.tile.petaImage === undefined) {
      return "#ffffff";
    }
    const petaColor = this.tile.petaImage.palette[0];
    if (petaColor) {
      return `rgb(${petaColor.r}, ${petaColor.g}, ${petaColor.b})`;
    }
    return "#ffffff";
  }
  myPetaTags: PetaTag[] = [];
  async fetchPetaTags() {
    if (!this.$settings.showTagsOnTile) {
      return;
    }
    if (this.tile.petaImage === undefined) {
      return;
    }
    const result = await API.send("getPetaTagIdsByPetaImageIds", [this.tile.petaImage.id]);
    this.myPetaTags = this.petaTagInfos
    .filter((petaTagInfo) => result.find((id) => id === petaTagInfo.petaTag.id))
    .map((pti) => pti.petaTag);
    this.loadingTags = false;
  }
  @Watch("tile.visible")
  changeVisible() {
    window.clearTimeout(this.fetchTagsTimeoutHandler);
    window.clearTimeout(this.loadOriginalTimeoutHandler);
    if (this.tile.visible) {
      this.fetchTagsTimeoutHandler = window.setTimeout(() => {
        this.fetchPetaTags();
      }, Math.random() * BROWSER_FETCH_TAGS_DELAY_RANDOM + BROWSER_FETCH_TAGS_DELAY);
      if (!this.loadedOriginal) {
        this.imageURL = getImageURL(this.tile.petaImage, ImageType.THUMBNAIL);
        if (this.original) {
          this.loadOriginalTimeoutHandler = window.setTimeout(() => {
            this.imageURL = getImageURL(this.tile.petaImage, ImageType.ORIGINAL);
            this.loadedOriginal = true;
          }, Math.random() * BROWSER_LOAD_ORIGINAL_DELAY_RANDOM + BROWSER_LOAD_ORIGINAL_DELAY);
        }
      }
    } else {
      this.loadedOriginal = false;
    }
  }
  @Watch("original")
  changeOriginal() {
    this.changeVisible();
  }
  @Watch("parentAreaMinY")
  changeParentAreaMinY() {
    this.changeVisible();
  }
  @Watch("parentAreaMaxY")
  changeParentAreaMaxY() {
    this.changeVisible();
  }
  @Watch("petaTagInfos")
  changeFetchTags() {
    this.changeVisible();
  }
  @Watch("$settings.showTagsOnTile")
  changeShowTagsOnTile() {
    this.changeVisible();
  }
}
</script>

<style lang="scss" scoped>
t-tile-root {
  display: block;
  position: absolute;
  padding-right: 8px;
  padding-top: 8px;
  >t-group {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
    display: block;
    text-align: center;
    line-height: 24px;
    font-weight: bold;
    font-size: 1.2em;
  }
  >t-tile-wrapper {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
    border-radius: var(--rounded);
    display: block;
    >t-images {
      display: block;
      width: 100%;
      height: 100%;
      cursor: pointer;
      filter: brightness(0.7);
      position: relative;
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
      >t-placeholder {
        position: absolute;
        z-index: 2;
        top: 0px;
        left: 0px;
        display: block;
        width: 100%;
        height: 100%;
        opacity: 1;
        transition: opacity 200ms ease-in-out;
        background-color: #ffffff;
        &.loaded {
          opacity: 0;
        }
      }
      >t-nsfw {
        z-index: 2;
        position: absolute;
        top: 0px;
        left: 0px;
        width: 100%;
        height: 100%;
        display: block;
        background-size: 32px;
        background-position: center;
        background-repeat: repeat;
        background-image: url("~@/@assets/nsfwBackground.png");
      }
    }
    &:hover {
      box-shadow: 1px 1px 5px rgba(0, 0, 0, 0.5);
      >t-images {
        filter: brightness(1.0);
      }
      >t-palette {
        visibility: visible;
      }
    }
    >t-tags {
      width: 100%;
      position: absolute;
      bottom: 0px;
      pointer-events: none;
      outline: none;
      padding: 2px 2px;
      font-size: 1.0em;
      word-break: break-word;
      text-align: left;
      display: flex;
      flex-direction: row;
      flex-wrap: wrap-reverse;
      justify-content: right;
      >t-tag {
        display: inline-block;
        margin: 1px 1px;
        border-radius: var(--rounded);
        padding: 3px;
        background-color: var(--tab-bg-color);
        font-size: 0.7em;
      }
    }
    >t-palette {
      position: absolute;
      visibility: hidden;
      top: 0px;
      pointer-events: none;
      padding: 8px;
      display: block;
      width: 100%;
      >t-color-background {
        display: flex;
        background-color: #ffffff;
        border-radius: var(--rounded);
        height: 8px;
        width: 100%;
        overflow: hidden;
        box-shadow: 0px 0px 0px 1.5px #ffffff, 0px 0px 2px 1.5px rgba(0, 0, 0, 0.5);
        >t-color {
          height: 100%;
          display: block;
        }
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