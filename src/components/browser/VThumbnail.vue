<template>
  <article
    class="thumbnail-root"
    :style="{ top: _y, left: _x, width: _width, height: _height }"
  >
    <div class="wrapper">
      <img
        draggable="false"
        :src="imageURL"
        @mousedown="mousedown($event)"
        v-if="_loaded"
        :class="{ 'selected-image': petaThumbnail.petaImage._selected }"
      >
      <div class="info">
        <span
          class="categories"
          v-for="k in petaThumbnail.petaImage.categories"
          :key="k"
        >
          {{k}}
        </span>
        <span
          class="categories"
          v-if="petaThumbnail.petaImage.categories.length == 0"
        >
          Uncategorized
        </span>
      </div>
      <div class="selected" v-show="petaThumbnail.petaImage._selected">
        <div class="checkbox">
          ✔
        </div>
      </div>
    </div>
  </article>
</template>

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
    background-color: #eeeeee;
    overflow: hidden;
    border-radius: 8px;
    img {
      display: block;
      width: 100%;
      height: 100%;
      cursor: pointer;
      filter: brightness(0.7);
      &.selected-image {
        filter: brightness(1.0);
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
    border-radius: 8px;
    width: 100%;
    height: 100%;
    border: solid 4px #333333;
    background-color: rgba($color: #ffffff, $alpha: 0.4);
    .checkbox {
      border-radius: 8px 0px 0px 0px;
      background-color: #333333;
      position: absolute;
      padding: 0px 6px;
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
    .categories {
      background-color: rgba($color: (#000000), $alpha: 0.5);
      padding: 2px;
      border-radius: 4px;
      margin-right: 4px;
      font-size: 0.7em;
    }
  }
}
</style>

<script lang="ts">
import { Options, Vue } from "vue-class-component";
import { createPetaPanel, MouseButton, PetaImage, PetaPanel, PetaThumbnail, UpdateMode } from "@/datas";
import { Prop, Ref, Watch } from "vue-property-decorator";
import { ClickChecker, Vec2 } from "@/utils";
import { ImageLoader } from "@/imageLoader";
import { API } from "@/api";
import LoadingImage from "@/assets/sample.png";
import { fromMouseEvent } from "@/utils/vec2";
// import { getImageData } from "@/utils";
@Options({
  components: {
  },
  emits: ["select", "add", "menu"]
})
export default class VThumbnail extends Vue {
  @Prop()
  petaThumbnail!: PetaThumbnail;
  imageURL = "";
  pressing = false;
  click: ClickChecker = new ClickChecker();
  async mounted() {
    this.imageURL = await ImageLoader.getImageURL(this.petaThumbnail.petaImage, true);
    if (!(this.$el as HTMLElement).parentElement) {
      ImageLoader.removeImageURL(this.petaThumbnail.petaImage, true);
    }
  }
  unmounted() {
    ImageLoader.removeImageURL(this.petaThumbnail.petaImage, true);
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
      this.$emit("add", this.petaThumbnail.petaImage, fromMouseEvent(event), position);
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
          this.$emit("select", this.petaThumbnail.petaImage);
          break;
        case MouseButton.RIGHT:
          this.$emit("menu", this.petaThumbnail.petaImage, fromMouseEvent(event));
          break;
      }
    }
  }
  get _categories() {
    return this.petaThumbnail.petaImage.categories.join(",");
  }
  set _categories(value: string) {
    this.petaThumbnail.petaImage.categories.splice(0, this.petaThumbnail.petaImage.categories.length);
    value.split(",").forEach((k) => {
      k = k.trim();
      this.petaThumbnail.petaImage.categories.push(k);
    });
    API.send("updatePetaImages", [this.petaThumbnail.petaImage], UpdateMode.UPDATE);
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
