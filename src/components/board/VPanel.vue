<template>
  <article
    class="panel-root"
    ref="container"
    :style="{
      transform: `translate(${_position}) rotate(${petaPanel.rotation}rad)`,
      zIndex: petaPanel.index
    }"
  >
    <div
      ref="img"
      :style="{
        width: normalWidth + 'px',
        height: normalHeight + 'px',
        transform: `scale(${scaleX}, ${scaleY})`,
        top: offsetY + 'px',
        left: offsetX + 'px',
        backgroundColor: loadedFullSize ? 'transparent' : '#cccccc',
      }"
      class="image"
    >
      <img
        :src="imageURL"
        draggable="false"
        @load="imageLoaded"
        :style="{
          left: cropPositionX + 'px',
          top: cropPositionY + 'px',
          transform: `scale(${cropScale})`
        }"
      >
    </div>
    <div
      class="selection"
      v-if="selected || hovered"
    >
      <VDottedBox
        :x="-width / 2 + (width < 0 ? width : 0)"
        :y="-height / 2 + (height < 0 ? height : 0)"
        :width="width"
        :height="height"
      />
    </div>
    <div class="transformer" v-if="selected">
      <div
        v-for="rp in rotatePoints"
        :key="rp.id"
        class="rotate-point"
        :style="{
          top: `${rp.y}px`,
          left: `${rp.x}px`,
          cursor: rotateCursor
        }"
        @mousedown.left="startRotate($event)"
      >
      </div>
      <div
        v-for="cp in controlPoints"
        :key="cp.id"
        class="control-point"
        :style="{
          top: `${cp.y}px`,
          left: `${cp.x}px`,
          transform: `rotate(${-petaPanel.rotation}rad)`,
          cursor: `${cp.cursor}`
        }"
        @mousedown.left="beginChangeSize(...cp.origin, $event)"
      >
        <div class="fill">

        </div>
      </div>
    </div>
  </article>
</template>

<script lang="ts">
// VUe
import { Options, Vue } from "vue-class-component";
import { Prop, Ref, Watch } from "vue-property-decorator";
// Components
import VDottedBox from "@/components/utils/VDottedBox.vue";
// Others
import { Vec2, vec2FromMouseEvent } from "@/utils/vec2";
import { ImageLoader } from "@/imageLoader";
import LoadingImage from "@/assets/sample.png";
import RotateCursor1x from "@/assets/rotateCursor1x.png";
import RotateCursor2x from "@/assets/rotateCursor2x.png";
import { IMG_TAG_WIDTH } from "@/defines";
import { PetaPanel } from "@/datas/petaPanel";
import { PetaBoardTransform } from "@/datas/petaBoard";
import { MouseButton } from "@/datas/mouseButton";
import { ClickChecker } from "@/utils/clickChecker";
import { log } from "@/api";
import { ImageType } from "@/datas/imageType";
ClickChecker
enum ControlStatus {
  DRAGGING = "dragging",
  ROTATING = "rotating",
  SIZING = "sizing",
  NONE = "none"
}
enum SizingOrigin {
  TOP = "top",
  LEFT = "left",
  RIGHT = "right",
  BOTTOM = "bottom",
  NONE = "none"
}
@Options({
  components: {
    VDottedBox
  },
  emits: [
    "press",
    "click",
    "select",
    "toFront",
    "menu"
  ]
})
export default class VPanel extends Vue {
  @Ref("img")
  img!: HTMLImageElement;
  @Ref("container")
  container!: HTMLDivElement;
  @Prop()
  petaPanel!: PetaPanel;
  @Prop()
  transform!: PetaBoardTransform;
  controlStatus = ControlStatus.NONE;
  dragOffset = new Vec2();
  sizeOffset = new Vec2();
  sizingBeginVSign = 1;
  sizingBeginHSign = 1;
  sizingVOrigin = SizingOrigin.TOP;
  sizingHOrigin = SizingOrigin.LEFT;
  rotateOffset = 0;
  currentRotation = 0;
  imageURL = "";
  loadedFullSize = false;
  resizeCursors = [ "ns-resize", "nesw-resize", "ew-resize", "nwse-resize", "ns-resize", "nesw-resize", "ew-resize", "nwse-resize" ];
  rotateCursor = `-webkit-image-set(
    url('${RotateCursor1x}') 1x,
    url('${RotateCursor2x}') 2x
  ) 11 11, auto`;
  hovered = false;
  click = new ClickChecker();
  imageLoadedPromiseResolve: (() => void) | null = null;
  loadedThumbnail = false;
  // vertical 縦
  // horizontal 横
  mounted() {
    this.img.addEventListener("mousedown", this.mousedown);
    this.img.addEventListener("mouseenter", this.mouseenter);
    this.img.addEventListener("mouseleave", this.mouseleave);
    window.addEventListener("mousemove", this.mousemove);
    window.addEventListener("mouseup", this.mouseup);
  }
  unmounted() {
    if (this.$settings.lowMemoryMode) {
      ImageLoader.removeImageURL(this.petaPanel._petaImage!, ImageType.FULLSIZED);
    }
    this.img.removeEventListener("mousedown", this.mousedown);
    this.img.removeEventListener("mouseenter", this.mouseenter);
    this.img.removeEventListener("mouseleave", this.mouseleave);
    window.removeEventListener("mousemove", this.mousemove);
    window.removeEventListener("mouseup", this.mouseup);
  }
  startDrag(worldPosition: Vec2) {
    const mouse = this.getMouseFromEvent(worldPosition);
    this.controlStatus = ControlStatus.DRAGGING;
    this.dragOffset.copyFrom(this.petaPanel.position.clone().sub(mouse));
  }
  startRotate(event: MouseEvent) {
    const mouse = this.getMouseFromEvent(vec2FromMouseEvent(event));
    this.controlStatus = ControlStatus.ROTATING;
    this.rotateOffset = mouse.clone().sub(this.petaPanel.position).atan2();
    this.currentRotation = this.petaPanel.rotation;
  }
  private mousedown(event: MouseEvent) {
    const worldPosition: Vec2 = vec2FromMouseEvent(event);
    this.click.down(event);
    switch (event.button) {
      case MouseButton.LEFT: {
        this.startDrag(worldPosition);
        this.$emit("press", this.petaPanel, vec2FromMouseEvent(event));
        break;
      }
      case MouseButton.RIGHT: {
        break;
      }
    }
  }
  mousemove(event: MouseEvent) {
    const mouse = this.getMouseFromEvent(vec2FromMouseEvent(event));
    this.click.move(event);
    switch (this.controlStatus) {
      case ControlStatus.DRAGGING: {
        this.petaPanel.position.copyFrom(mouse.clone().add(this.dragOffset));
        break;
      }
      case ControlStatus.SIZING: {
        const rMouse = mouse.clone().rotate(-this.petaPanel.rotation);
        const rPos = this.petaPanel.position.clone().rotate(-this.petaPanel.rotation);
        const d = rMouse.clone().sub(this.sizeOffset);
        this.sizeOffset.copyFrom(rMouse);
        if (this.sizingHOrigin == SizingOrigin.LEFT || this.sizingHOrigin == SizingOrigin.RIGHT) {
          rPos.x += d.x / 2;
          if (this.sizingHOrigin == SizingOrigin.RIGHT) {
            this.petaPanel.width += d.x;
          } else {
            this.petaPanel.width -= d.x;
          }
          const height = this.petaPanel.width * this.ratio * this.sizingBeginHSign * this.sizingBeginVSign;
          if (this.sizingVOrigin == SizingOrigin.BOTTOM){
            rPos.y += (height - this.petaPanel.height) / 2;
          } else if (this.sizingVOrigin == SizingOrigin.TOP) {
            rPos.y -= (height - this.petaPanel.height) / 2;
          }
          this.petaPanel.height = height;
          if (this.sizingVOrigin == SizingOrigin.NONE){
            this.petaPanel.height = Math.abs(this.petaPanel.height) * this.sizingBeginVSign;
          }
        } else {
          rPos.y += d.y / 2;
          if (this.sizingVOrigin == SizingOrigin.BOTTOM) {
            this.petaPanel.height += d.y;
          } else {
            this.petaPanel.height -= d.y;
          }
          this.petaPanel.width = this.petaPanel.height / this.ratio;
          if (this.sizingHOrigin == SizingOrigin.NONE) {
            this.petaPanel.width = Math.abs(this.petaPanel.width) * this.sizingBeginHSign;
          }
        }
        this.petaPanel.position = rPos.rotate(this.petaPanel.rotation);
        break;
      }
      case ControlStatus.ROTATING: {
        const rotation = mouse.clone().sub(this.petaPanel.position).atan2();
        this.currentRotation += rotation - this.rotateOffset;
        this.rotateOffset = rotation;
        this.petaPanel.rotation = this.currentRotation;
        if (this.$keyboards.shift) {
          this.fitRotation();
        }
        break;
      }
    }
  }
  fitRotation() {
    const rot = Math.floor(this.currentRotation / Math.PI * 180 + 90 / 2) % 360;
    this.petaPanel.rotation = Math.floor((rot + (rot < 0 ? 360 : 0)) / 90) * (Math.PI / 2);
  }
  mouseup(event: MouseEvent) {
    switch(event.button) {
      case MouseButton.LEFT: {
        this.controlStatus = ControlStatus.NONE;
        if (this.click.isClick) {
          this.$emit("click", this.petaPanel);
        }
        break;
      }
      case MouseButton.RIGHT: {
        if (this.click.isClick) {
          this.$emit("menu", this.petaPanel, vec2FromMouseEvent(event));
        }
        break;
      }
    }
  }
  mouseenter() {
    this.hovered = true;
  }
  mouseleave() {
    this.hovered = false;
  }
  async load(type: ImageType) {
    if (type == ImageType.THUMBNAIL) {
      this.loadedThumbnail = true;
    } else {
      this.loadedFullSize = true;
    }
    this.imageURL = await ImageLoader.getImageURL(this.petaPanel._petaImage!, type);
    return new Promise<void>((res, rej) => {
      this.imageLoadedPromiseResolve = res;
    });
  }
  imageLoaded(e: Event) {
    if (this.imageLoadedPromiseResolve) {
      this.imageLoadedPromiseResolve();
      this.imageLoadedPromiseResolve = null;
    }
  }
  beginChangeSize(vOrigin: SizingOrigin, hOrigin: SizingOrigin, event: MouseEvent) {
    const mouse = this.getMouseFromEvent(vec2FromMouseEvent(event));
    const rMouse = mouse.clone().rotate(-this.petaPanel.rotation);
    this.sizeOffset.copyFrom(rMouse);
    this.controlStatus = ControlStatus.SIZING;
    this.sizingVOrigin = vOrigin;
    this.sizingHOrigin = hOrigin;
    this.sizingBeginVSign = this.petaPanel.height > 0 ? 1 : -1;
    this.sizingBeginHSign = this.petaPanel.width > 0 ? 1 : -1;
  }
  getMouseFromEvent(worldPosition: Vec2) {
    // 座標変換
    return worldPosition.clone().sub(this.transform.position).mult(1 / this.transform.scale);
  }
  getResizeCursor(index: number) {
    const rot = Math.floor(this.petaPanel.rotation / Math.PI * 180 + 45 / 2) % 360;
    const offset = Math.floor((rot + (rot < 0 ? 360 : 0)) / 45) + 8;
    const direction = (this.height > 0 ? 1 : -1) * (this.width > 0 ? 1 : -1);
    return this.resizeCursors[(offset + index * direction) % 8];
  }
  @Watch("petaPanel.crop", { deep: true })
  changeCrop() {
    const sign = this.petaPanel.height < 0 ? -1 : 1;
    this.petaPanel.height = Math.abs(this.petaPanel.width * this.ratio) * sign;
  }
  get ratio() {
    return (this.petaPanel.crop.height * this.petaPanel._petaImage!.height) / (this.petaPanel.crop.width * this.petaPanel._petaImage!.width);
  }
  get normalWidth() {
    return IMG_TAG_WIDTH;
  }
  get normalHeight() {
    return IMG_TAG_WIDTH * this.ratio;
  }
  get cropScale() {
    return 1 / this.petaPanel.crop.width;
  }
  get _position() {
    return `${(this.petaPanel.position.x) * this.transform.scale}px, ${(this.petaPanel.position.y) * this.transform.scale}px`;
  }
  get width() {
    return this.petaPanel.width * this.transform.scale;
  }
  get height() {
    return this.petaPanel.height * this.transform.scale;
  }
  get scaleX() {
    return this.petaPanel.width / IMG_TAG_WIDTH * this.transform.scale;
  }
  get scaleY() {
    return this.petaPanel.height / this.normalHeight * this.transform.scale;
  }
  get offsetX() {
    return -this.normalWidth / 2;
  }
  get offsetY() {
    return -this.normalHeight / 2;
  }
  get cropPositionX() {
    return -this.petaPanel.crop.position.x * IMG_TAG_WIDTH * this.cropScale;
  }
  get cropPositionY() {
    return -this.petaPanel.crop.position.y * IMG_TAG_WIDTH * this.petaPanel._petaImage!.height * this.cropScale;
  }
  get controlPoints() {
    const points: { [key: string]: { origin: string[], x: number, y: number, cursor: string } } = {
      TOP_MID: {
        origin: [SizingOrigin.TOP, SizingOrigin.NONE],
        x: 0, y: -this.height / 2,
        cursor: this.getResizeCursor(0)
      },
      TOP_RIGHT: {
        origin: [SizingOrigin.TOP, SizingOrigin.RIGHT],
        x: this.width / 2, y: -this.height / 2,
        cursor: this.getResizeCursor(1)
      },
      MID_RIGHT: {
        origin: [SizingOrigin.NONE, SizingOrigin.RIGHT],
        x: this.width / 2, y: 0,
        cursor: this.getResizeCursor(2)
      },
      BOTTOM_RIGHT: {
        origin: [SizingOrigin.BOTTOM, SizingOrigin.RIGHT],
        x: this.width / 2, y: this.height / 2,
        cursor: this.getResizeCursor(3)
      },
      BOTTOM_MID: {
        origin: [SizingOrigin.BOTTOM, SizingOrigin.NONE],
        x: 0, y: this.height / 2,
        cursor: this.getResizeCursor(4)
      },
      BOTTOM_LEFT: {
        origin: [SizingOrigin.BOTTOM, SizingOrigin.LEFT],
        x: -this.width / 2, y: this.height / 2,
        cursor: this.getResizeCursor(5)
      },
      MID_LEFT: {
        origin: [SizingOrigin.NONE, SizingOrigin.LEFT],
        x: -this.width / 2, y: 0,
        cursor: this.getResizeCursor(6)
      },
      TOP_LEFT: {
        origin: [SizingOrigin.TOP, SizingOrigin.LEFT],
        x: -this.width / 2, y: -this.height / 2,
        cursor: this.getResizeCursor(7)
      }
    };
    return Object.keys(points).map((k) => ({
      id: k,
      ...points[k]
    }));
  }
  get rotatePoints() {
    const offset = 20;
    const xOffset = (this.petaPanel.width > 0 ? 1 : -1) * offset;
    const yOffset = (this.petaPanel.height > 0 ? 1 : -1) * offset;
    const points: { [key: string]: { x: number, y: number, cursor: string } } = {
      TOP_MID: {
        x: 0, y: -this.height / 2 - yOffset,
        cursor: this.getResizeCursor(0)
      },
      TOP_RIGHT: {
        x: this.width / 2 + xOffset, y: -this.height / 2  - yOffset,
        cursor: this.getResizeCursor(1)
      },
      MID_RIGHT: {
        x: this.width / 2 + xOffset, y: 0,
        cursor: this.getResizeCursor(2)
      },
      BOTTOM_RIGHT: {
        x: this.width / 2 + xOffset, y: this.height / 2 + yOffset,
        cursor: this.getResizeCursor(3)
      },
      BOTTOM_MID: {
        x: 0, y: this.height / 2 + yOffset,
        cursor: this.getResizeCursor(4)
      },
      BOTTOM_LEFT: {
        x: -this.width / 2 - xOffset, y: this.height / 2 + yOffset,
        cursor: this.getResizeCursor(5)
      },
      MID_LEFT: {
        x: -this.width / 2 - xOffset, y: 0,
        cursor: this.getResizeCursor(6)
      },
      TOP_LEFT: {
        x: -this.width / 2 - xOffset, y: -this.height / 2 - yOffset,
        cursor: this.getResizeCursor(7)
      }
    };
    return Object.keys(points).map((k) => ({
      id: k,
      ...points[k]
    }));
  }
  get selected() {
    return this.petaPanel._selected;
  }
}
</script>

<style lang="scss" scoped>
.panel-root {
  position: absolute;
  .image {
    transform-origin: center;
    position: absolute;
    display: block;
    cursor: move;
    overflow: hidden;
    img {
      width: 100%;
      position: relative;
      transform-origin: top left;
      pointer-events: none;
    }
  }
  .selection {
    position: absolute;
    z-index: 1;
  }
  .transformer {
    position: absolute;
    z-index: 2;
    .rotate-point {
      position: absolute;
      width: 40px;
      height: 40px;
      margin: -20px -20px;
      z-index: 1;
    }
    .control-point {
      position: absolute;
      width: 24px;
      height: 24px;
      margin: -12px -12px;
      padding: 6px;
      z-index: 2;
      .fill {
        border: solid 1px;
        background-color: #ffffff;
        border-color: #000000;
        width: 100%;
        height: 100%;
      }
    }
  }
}
</style>