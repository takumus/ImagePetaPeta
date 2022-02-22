<template>
  <article class="crop-root">
    <div class="wrapper">
      <div
        ref="size"
        class="size"
      >

      </div>
      <div
        ref="images"
        class="images"
        :style="{
          width: imageWidth + 'px',
          height: imageHeight + 'px'
        }"
      >
        <img
          :src="imageURL"
          draggable="false"
          class="back"
        >
        <img
          :src="imageURL"
          draggable="false"
          :style="{
            clipPath: `polygon(${cropX}px ${cropY}px, ${cropX + renderCropWidth}px ${cropY}px, ${cropX + renderCropWidth}px ${cropY + renderCropHeight}px, ${cropX}px ${cropY + renderCropHeight}px)`
          }"
          class="front"
        >
        <div class="dottedbox">
          <VDottedBox
            :x="cropX"
            :y="cropY"
            :width="renderCropWidth"
            :height="renderCropHeight"
          />
        </div>
      </div>
    </div>
  </article>
</template>

<script lang="ts">
// Vue
import { Options, Vue } from "vue-class-component";
import { Prop, Ref } from "vue-property-decorator";
// Components
import VDottedBox from "@/renderer/components/utils/VDottedBox.vue";
// Others
import { Vec2 } from "@/utils/vec2";
import { getImageURL } from "@/renderer/utils/imageURL";
import { IMG_TAG_WIDTH } from "@/defines";
import { PetaPanel } from "@/datas/petaPanel";
import { MouseButton } from "@/datas/mouseButton";
import { ClickChecker } from "@/renderer/utils/clickChecker";
import { ImageType } from "@/datas/imageType";
@Options({
  components: {
    VDottedBox
  },
  emits: [
    "update"
  ]
})
export default class VCrop extends Vue {
  @Prop()
  petaPanel!: PetaPanel;
  @Ref("size")
  size!: HTMLDivElement;
  @Ref("images")
  images!: HTMLDivElement;
  imageURL = "";
  dragging = false;
  dragBeginPosition: Vec2 = new Vec2();
  cropBegin: Vec2 = new Vec2(0, 0);
  cropEnd: Vec2 = new Vec2(1, 1);
  imageWidth = 0;
  imageHeight = 0;
  imageResizer?: ResizeObserver;
  clicker: ClickChecker = new ClickChecker();
  mounted() {
    if (this.petaPanel._petaImage) {
      this.imageURL = getImageURL(this.petaPanel._petaImage, ImageType.FULLSIZED);
    }
    window.addEventListener("mousedown", this.mousedown);
    window.addEventListener("mousemove", this.mousemove);
    window.addEventListener("mouseup", this.mouseup);
    this.cropBegin.set(this.petaPanel.crop.position);
    this.cropEnd.x = this.cropBegin.x + this.petaPanel.crop.width;
    this.cropEnd.y = this.cropBegin.y + this.petaPanel.crop.height;
    this.imageResizer = new ResizeObserver((entries: ResizeObserverEntry[]) => this.resizeImage(entries[0].contentRect));
    this.imageResizer.observe(this.size);
  }
  unmounted() {
    window.removeEventListener("mousedown", this.mousedown);
    window.removeEventListener("mousemove", this.mousemove);
    window.removeEventListener("mouseup", this.mouseup);
    this.imageResizer?.unobserve(this.size);
    this.imageResizer?.disconnect();
  }
  mousedown(e: MouseEvent) {
    if (e.button != MouseButton.LEFT) return;
    const imgRect = this.images.getBoundingClientRect();
    const mouse = new Vec2(
      (e.clientX - imgRect.x) / imgRect.width,
      (e.clientY - imgRect.y) / imgRect.height
    );
    this.dragBeginPosition = mouse;
    this.dragging = true;
    this.cropBegin.set(mouse);
    this.cropEnd.set(mouse);
    this.dragging = true;
    this.clicker.down(new Vec2(e.clientX, e.clientY));
  }
  mousemove(e: MouseEvent) {
    this.clicker.move(new Vec2(e.clientX, e.clientY));
    if (!this.dragging) return;
    const imgRect = this.images.getBoundingClientRect();
    const mouse = new Vec2(
      (e.clientX - imgRect.x) / imgRect.width,
      (e.clientY - imgRect.y) / imgRect.height
    );
    if (!this.clicker.isClick) {
      this.cropEnd.set(mouse);
    }
  }
  mouseup(e: MouseEvent) {
    if (this.dragging) {
      if (this.clicker.isClick) {
        //
      } else {
        let width = this.cropWidth;
        let height = this.cropHeight;
        this.petaPanel.crop.position.set(this.cropPosition);
        if (width * IMG_TAG_WIDTH < 5) {
          width = 5 / IMG_TAG_WIDTH;
        }
        if (height * IMG_TAG_WIDTH < 5) {
          height = 5 / IMG_TAG_WIDTH;
        }
        this.petaPanel.crop.width = width;
        this.petaPanel.crop.height = height;
      }
      this.$emit("update", this.petaPanel);
    }
    this.dragging = false;
  }
  get cropPosition() {
    return new Vec2(
      this.arrangeValue(Math.min(this.cropBegin.x, this.cropEnd.x)),
      this.arrangeValue(Math.min(this.cropBegin.y, this.cropEnd.y))
    );
  }
  get cropWidth() {
    return Math.abs(this.arrangeValue(this.cropBegin.x) - this.arrangeValue(this.cropEnd.x));
  }
  get cropHeight() {
    return Math.abs(this.arrangeValue(this.cropBegin.y) - this.arrangeValue(this.cropEnd.y));
  }
  arrangeValue(value: number) {
    if (value < 0) return 0;
    if (value > 1) return 1;
    return value;
  }
  resizeImage(rect: DOMRectReadOnly) {
    if (!this.petaPanel._petaImage) {
      return;
    }
    if (this.petaPanel._petaImage.height / this.petaPanel._petaImage.width < rect.height / rect.width) {
      this.imageWidth = rect.width;
      this.imageHeight = rect.width * this.petaPanel._petaImage.height;
    } else {
      this.imageHeight = rect.height;
      this.imageWidth = rect.height / this.petaPanel._petaImage.height;
    }
  }
  get cropX() {
    return this.cropPosition.x * this.imageWidth;
  }
  get cropY() {
    return this.cropPosition.y * this.imageHeight;
  }
  get renderCropWidth() {
    return this.cropWidth * this.imageWidth;
  }
  get renderCropHeight() {
    return this.cropHeight * this.imageHeight;
  }
}
</script>

<style lang="scss" scoped>
.crop-root {
  width: 100%;
  height: 100%;
  padding: 128px;
  cursor: crosshair;
  >.wrapper {
    width: 100%;
    height: 100%;
    position: relative;
    >.images {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 0;
      right: 0;
      margin: auto;
      >img {
        position: absolute;
        z-index: 1;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        &.back {
          filter: invert(100%) brightness(30%);
        }
        &.front {
          pointer-events: none;
        }
      }
      >.dottedbox {
        position: absolute;
        z-index: 2;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
      }
    }
    >.size {
      width: 100%;
      height: 100%;
    }
  }
}
</style>