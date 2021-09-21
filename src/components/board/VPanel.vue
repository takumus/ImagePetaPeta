<template>
  <article class="panel-root"
    ref="container"
    :style="{
      transform: `translate(${_position}) rotate(${_rotation}rad)`,
      zIndex: _zIndex
    }"
  >
    <div
      ref="img"
      :style="{
        width: _normalizedWidth,
        height: _normalizedHeight,
        transform: `scale(${_scaleX}, ${_scaleY})`,
        top: `${_offsetY}`,
        left: `${_offsetX}`
      }"
      class="image"
    >
      <img
        :src="imageURL"
        draggable="false"
        :style="{
          left: _cropPositionX,
          top: _cropPositionY,
          transform: `scale(${_cropScale})`
        }"
      >
    </div>
    <div class="selection" v-if="_selected || hovered">
      <VDottedBox :x="-_width / 2 + (_width < 0 ? _width : 0)" :y="-_height / 2 + (_height < 0 ? _height : 0)" :width="_width" :height="_height" />
    </div>
    <div class="transformer" v-if="_selected">
      <div
        v-for="rp in _rotatePoints"
        :key="rp.id"
        class="rotate-point"
        :style="{ top: `${rp.y}px`, left: `${rp.x}px`, cursor: rotateCursor }"
        @mousedown="startRotate($event)"
      >
      </div>
      <div
        v-for="cp in _controlPoint"
        :key="cp.id"
        class="control-point"
        :style="{top: `${cp.y}px`, left: `${cp.x}px`, transform: `rotate(${-_rotation}rad)`, cursor: `${cp.cursor}`}"
        @mousedown="beginChangeSize(...cp.origin, $event)"
      >
        <div class="fill">

        </div>
      </div>
    </div>
  </article>
</template>

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
  }
  .transformer {
    position: absolute;
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

<script lang="ts">
import { Options, Vue } from "vue-class-component";
import { Prop, Ref, Watch } from "vue-property-decorator";
import { ClickChecker, Vec2 } from "@/utils";
import { ImageLoader } from "@/imageLoader";
import { BoardTransform, MenuType, MouseButton, PetaImage, PetaPanel } from "@/datas";
import { API, log } from "@/api";
import LoadingImage from "@/assets/sample.png";
import RotateCursor from "@/assets/rotateCursor.png";
import { IMG_TAG_WIDTH } from "@/defines";
import VDottedBox from "@/components/utils/VDottedBox.vue";
import { fromMouseEvent } from "@/utils/vec2";
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
  transform!: BoardTransform;
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
  shiftKeyPressed = false;
  resizeCursors = [ "ns-resize", "nesw-resize", "ew-resize", "nwse-resize", "ns-resize", "nesw-resize", "ew-resize", "nwse-resize" ];
  rotateCursor = `url('${RotateCursor}') 18 18, auto`;
  hovered = false;
  click = new ClickChecker();
  // vertical 縦
  // horizontal 横
  mounted() {
    ImageLoader.getImageURL(this.petaPanel.petaImage, true).then((url) => {
      if (!this.loadedFullSize) {
        this.imageURL = url;
      }
    })
    this.img.addEventListener("mousedown", this.mousedown);
    this.img.addEventListener("mouseenter", this.mouseenter);
    this.img.addEventListener("mouseleave", this.mouseleave);
    window.addEventListener("mousemove", this.mousemove);
    window.addEventListener("mouseup", this.mouseup);
    window.addEventListener("keydown", this.keydown);
    window.addEventListener("keyup", this.keyup);
  }
  unmounted() {
    this.img.removeEventListener("mousedown", this.mousedown);
    this.img.removeEventListener("mouseenter", this.mouseenter);
    this.img.removeEventListener("mouseleave", this.mouseleave);
    window.removeEventListener("mousemove", this.mousemove);
    window.removeEventListener("mouseup", this.mouseup);
    window.removeEventListener("keydown", this.keydown);
    window.removeEventListener("keyup", this.keyup);
  }
  startDrag(worldPosition: Vec2) {
    const mouse = this.getMouseFromEvent(worldPosition);
    this.controlStatus = ControlStatus.DRAGGING;
    this.dragOffset.x = this.petaPanel.position.x - mouse.x;
    this.dragOffset.y = this.petaPanel.position.y - mouse.y;
  }
  startRotate(event: MouseEvent) {
    const mouse = this.getMouseFromEvent(fromMouseEvent(event));
    this.controlStatus = ControlStatus.ROTATING;
    const dx = mouse.x - (this.petaPanel.position.x);
    const dy = mouse.y - (this.petaPanel.position.y);
    const radian = Math.atan2(dy, dx);
    this.rotateOffset = radian;
    this.currentRotation = this.petaPanel.rotation;
  }
  keydown(e: KeyboardEvent) {
    if (e.key == "Shift") {
      this.shiftKeyPressed = true;
      if (this.controlStatus == ControlStatus.ROTATING) {
        this.fitRotation();
      }
    }
  }
  keyup(e: KeyboardEvent) {
    if (e.key == "Shift") {
      this.shiftKeyPressed = false;
    }
  }
  private mousedown(event: MouseEvent) {
    const worldPosition: Vec2 = fromMouseEvent(event);
    switch (event.button) {
      case MouseButton.LEFT: {
        this.startDrag(worldPosition);
        this.$emit("select", this.petaPanel, fromMouseEvent(event));
        if (!this.shiftKeyPressed) {
          this.$emit("toFront", this.petaPanel);
        }
        break;
      }
      case MouseButton.RIGHT: {
        this.click.down(event);
        break;
      }
    }
  }
  mousemove(event: MouseEvent) {
    const mouse = this.getMouseFromEvent(fromMouseEvent(event));
    this.click.move(event);
    switch (this.controlStatus) {
      case ControlStatus.DRAGGING: {
        this.petaPanel.position.x = mouse.x + this.dragOffset.x;
        this.petaPanel.position.y = mouse.y + this.dragOffset.y;
        break;
      }
      case ControlStatus.SIZING: {
        const rMouse = mouse.clone().rotate(-this.petaPanel.rotation);
        const rPos = this.petaPanel.position.clone().rotate(-this.petaPanel.rotation);
        const dx = rMouse.x - this.sizeOffset.x;
        const dy = rMouse.y - this.sizeOffset.y;
        this.sizeOffset.x = rMouse.x;
        this.sizeOffset.y = rMouse.y;
        if (this.sizingHOrigin == SizingOrigin.LEFT || this.sizingHOrigin == SizingOrigin.RIGHT) {
          rPos.x += dx / 2;
          if (this.sizingHOrigin == SizingOrigin.RIGHT) {
            this.petaPanel.width += dx;
          } else {
            this.petaPanel.width -= dx;
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
          rPos.y += dy / 2;
          if (this.sizingVOrigin == SizingOrigin.BOTTOM) {
            this.petaPanel.height += dy;
          } else {
            this.petaPanel.height -= dy;
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
        const dx = mouse.x - (this.petaPanel.position.x);
        const dy = mouse.y - (this.petaPanel.position.y);
        const rotation = Math.atan2(dy, dx);
        this.currentRotation += rotation - this.rotateOffset;
        this.rotateOffset = rotation;
        this.petaPanel.rotation = this.currentRotation;
        if (this.shiftKeyPressed) {
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
        this.loadFullSize();
        this.controlStatus = ControlStatus.NONE;
        break;
      }
      case MouseButton.RIGHT: {
        if (this.click.isClick) {
          this.$emit("menu", this.petaPanel, fromMouseEvent(event));
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
  async loadFullSize() {
    if (this.loadedFullSize) return;
    this.loadedFullSize = true;
    this.imageURL = LoadingImage;
    this.imageURL = await ImageLoader.getImageURL(this.petaPanel.petaImage, false);
  }
  beginChangeSize(vOrigin: SizingOrigin, hOrigin: SizingOrigin, event: MouseEvent) {
    const mouse = this.getMouseFromEvent(fromMouseEvent(event));
    const rMouse = mouse.clone().rotate(-this.petaPanel.rotation);
    this.sizeOffset.x = rMouse.x;
    this.sizeOffset.y = rMouse.y;
    this.controlStatus = ControlStatus.SIZING;
    this.sizingVOrigin = vOrigin;
    this.sizingHOrigin = hOrigin;
    this.sizingBeginVSign = this.petaPanel.height > 0 ? 1 : -1;
    this.sizingBeginHSign = this.petaPanel.width > 0 ? 1 : -1;
  }
  getMouseFromEvent(worldPosition: Vec2) {
    // 座標変換
    const mouse = new Vec2(worldPosition.x - this.transform.position.x, worldPosition.y - this.transform.position.y);
    mouse.mult(1 / this.transform.scale);
    return mouse;
  }
  getResizeCursor(index: number) {
    const rot = Math.floor(this.petaPanel.rotation / Math.PI * 180 + 45 / 2) % 360;
    const offset = Math.floor((rot + (rot < 0 ? 360 : 0)) / 45) + 8;
    const direction = (this._height > 0 ? 1 : -1) * (this._width > 0 ? 1 : -1);
    return this.resizeCursors[(offset + index * direction) % 8];
  }
  @Watch("petaPanel.crop", { deep: true })
  changeCrop() {
    const sign = this.petaPanel.height < 0 ? -1 : 1;
    this.petaPanel.height = Math.abs(this.petaPanel.width * this.ratio) * sign;
  }
  get ratio() {
    return (this.petaPanel.crop.height * this.petaPanel.petaImage.height) / (this.petaPanel.crop.width * this.petaPanel.petaImage.width);
  }
  get normalHeight() {
    return IMG_TAG_WIDTH * this.ratio;
  }
  get cropScale() {
    return 1 / this.petaPanel.crop.width;
  }
  get _zIndex() {
    return this.petaPanel.index;
  }
  get _position() {
    return `${(this.petaPanel.position.x) * this.transform.scale}px, ${(this.petaPanel.position.y) * this.transform.scale}px`;
  }
  get _rotation() {
    return this.petaPanel.rotation;
  }
  get _width() {
    return this.petaPanel.width * this.transform.scale;
  }
  get _height() {
    return this.petaPanel.height * this.transform.scale;
  }
  get _scaleX() {
    return this.petaPanel.width / IMG_TAG_WIDTH * this.transform.scale;
  }
  get _scaleY() {
    return this.petaPanel.height / this.normalHeight * this.transform.scale;
  }
  get _offsetX() {
    return `${-IMG_TAG_WIDTH / 2}px`;
  }
  get _offsetY() {
    return `${-this.normalHeight / 2}px`;
  }
  get _normalizedWidth() {
    return `${IMG_TAG_WIDTH}px`;
  }
  get _normalizedHeight() {
    return `${this.normalHeight}px`;
  }
  get _cropPositionX() {
    return -this.petaPanel.crop.position.x * IMG_TAG_WIDTH * this.cropScale + "px";
  }
  get _cropPositionY() {
    return -this.petaPanel.crop.position.y * IMG_TAG_WIDTH * this.petaPanel.petaImage.height * this.cropScale + "px";
  }
  get _cropScale() {
    return this.cropScale;
  }
  get _controlPoint() {
    const points: {[key: string]: {origin: string[], x: number, y: number, cursor: string}} = {
      TOP_MID: {
        origin: [SizingOrigin.TOP, SizingOrigin.NONE],
        x: 0, y: -this._height / 2,
        cursor: this.getResizeCursor(0)
      },
      TOP_RIGHT: {
        origin: [SizingOrigin.TOP, SizingOrigin.RIGHT],
        x: this._width / 2, y: -this._height / 2,
        cursor: this.getResizeCursor(1)
      },
      MID_RIGHT: {
        origin: [SizingOrigin.NONE, SizingOrigin.RIGHT],
        x: this._width / 2, y: 0,
        cursor: this.getResizeCursor(2)
      },
      BOTTOM_RIGHT: {
        origin: [SizingOrigin.BOTTOM, SizingOrigin.RIGHT],
        x: this._width / 2, y: this._height / 2,
        cursor: this.getResizeCursor(3)
      },
      BOTTOM_MID: {
        origin: [SizingOrigin.BOTTOM, SizingOrigin.NONE],
        x: 0, y: this._height / 2,
        cursor: this.getResizeCursor(4)
      },
      BOTTOM_LEFT: {
        origin: [SizingOrigin.BOTTOM, SizingOrigin.LEFT],
        x: -this._width / 2, y: this._height / 2,
        cursor: this.getResizeCursor(5)
      },
      MID_LEFT: {
        origin: [SizingOrigin.NONE, SizingOrigin.LEFT],
        x: -this._width / 2, y: 0,
        cursor: this.getResizeCursor(6)
      },
      TOP_LEFT: {
        origin: [SizingOrigin.TOP, SizingOrigin.LEFT],
        x: -this._width / 2, y: -this._height / 2,
        cursor: this.getResizeCursor(7)
      }
    };
    return Object.keys(points).map((k) => ({
      id: k,
      ...points[k]
    }));
  }
  get _rotatePoints() {
    const offset = 20;
    const xOffset = (this.petaPanel.width > 0 ? 1 : -1) * offset;
    const yOffset = (this.petaPanel.height > 0 ? 1 : -1) * offset;
    const points: {[key: string]: {x: number, y: number, cursor: string}} = {
      TOP_MID: {
        x: 0, y: -this._height / 2 - yOffset,
        cursor: this.getResizeCursor(0)
      },
      TOP_RIGHT: {
        x: this._width / 2 + xOffset, y: -this._height / 2  - yOffset,
        cursor: this.getResizeCursor(1)
      },
      MID_RIGHT: {
        x: this._width / 2 + xOffset, y: 0,
        cursor: this.getResizeCursor(2)
      },
      BOTTOM_RIGHT: {
        x: this._width / 2 + xOffset, y: this._height / 2 + yOffset,
        cursor: this.getResizeCursor(3)
      },
      BOTTOM_MID: {
        x: 0, y: this._height / 2 + yOffset,
        cursor: this.getResizeCursor(4)
      },
      BOTTOM_LEFT: {
        x: -this._width / 2 - xOffset, y: this._height / 2 + yOffset,
        cursor: this.getResizeCursor(5)
      },
      MID_LEFT: {
        x: -this._width / 2 - xOffset, y: 0,
        cursor: this.getResizeCursor(6)
      },
      TOP_LEFT: {
        x: -this._width / 2 - xOffset, y: -this._height / 2 - yOffset,
        cursor: this.getResizeCursor(7)
      }
    };
    return Object.keys(points).map((k) => ({
      id: k,
      ...points[k]
    }));
  }
  get _selected() {
    return this.petaPanel._selected;
  }
}
</script>