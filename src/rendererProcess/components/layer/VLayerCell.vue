<template>
  <li
    class="layer-cell-root"
    :class="{
      drag: drag,
      hide: hide,
      selected: selected
    }"
    @mousedown.left="mousedown($event)"
    @mousemove="mousemove($event)"
  >
    <div
      class="icon eye"
      ref="visibleIcon"
      :class="{
        disabled: !visible
      }"
      :style="{
        backgroundImage: `url(${visibleIconImage})`
      }"
    >
    </div>
    <div
      class="icon lock"
      ref="lockedIcon"
      :class="{
        disabled: !locked
      }"
      :style="{
        backgroundImage: `url(${lockedIconImage})`
      }"
    >
    </div>
    <div
      :v-if="url"
      :style="{
        backgroundImage: `url(${url})`
      }"
      class="image"
    >
    </div>
    <!-- <div class="icon" @mousedown="startDrag(layerCellData, $event)">
      =
    </div> -->
  </li>
</template>

<script lang="ts">
// Vue
import { ImageType } from "@/commons/datas/imageType";
import { getImageURL } from "@/rendererProcess/utils/imageURL";
import { Options, Vue } from "vue-class-component";
import { Prop, Ref, Watch } from "vue-property-decorator";
import { PPanel } from "../board/ppanels/PPanel";
import EyeIcon from "@/@assets/eye.png";
import LockedIcon from "@/@assets/locked.png";
import { ClickChecker } from "@/rendererProcess/utils/clickChecker";
import { vec2FromMouseEvent } from "@/commons/utils/vec2";
// Others
@Options({
  components: {
    //
  },
  emits: [
    "startDrag"
  ]
})
export default class VLayerCell extends Vue {
  @Prop()
  layerCellData: PPanel | null = null;
  @Prop()
  drag = false;
  @Prop()
  currentDraggingId!: string;
  @Ref()
  visibleIcon!: HTMLElement;
  @Ref()
  lockedIcon!: HTMLElement;
  click: ClickChecker = new ClickChecker();
  mouseIsDown = false;
  async mounted() {
    window.addEventListener("mouseup", this.mouseup);
  }
  unmounted() {
    window.removeEventListener("mouseup", this.mouseup);
  }
  get hide() {
    return this.currentDraggingId == this.layerCellData?.petaPanel.id;
  }
  get url() {
    return this.layerCellData ? getImageURL(this.layerCellData.petaPanel._petaImage, ImageType.THUMBNAIL) : undefined;
  }
  get selected() {
    return this.layerCellData?.selected;
  }
  get visibleIconImage() {
    return EyeIcon;
  }
  get lockedIconImage() {
    return LockedIcon;
  }
  get locked() {
    return this.layerCellData?.petaPanel.locked;
  }
  get visible() {
    return this.layerCellData?.petaPanel.visible;
  }
  mousedown(event: MouseEvent) {
    this.click.down(vec2FromMouseEvent(event));
    this.mouseIsDown = true;
  }
  mouseup(event: MouseEvent) {
    this.mouseIsDown = false;
    if (this.click.isClick && this.layerCellData) {
      if (event.target == this.visibleIcon) {
        this.layerCellData.petaPanel.visible = !this.layerCellData?.petaPanel.visible;
      } else if (event.target == this.lockedIcon) {
        this.layerCellData.petaPanel.locked = !this.layerCellData?.petaPanel.locked;
      }
    }
  }
  mousemove(event: MouseEvent) {
    if (!this.mouseIsDown) {
      return;
    }
    this.click.move(vec2FromMouseEvent(event));
    if (!this.click.isClick) {
      this.$emit("startDrag", this.layerCellData, event);
    }
  }
}
</script>

<style lang="scss" scoped>
.layer-cell-root {
  cursor: pointer;
  margin: 0px;
  padding: 4px;
  background-color: var(--button-bg-color);
  display: flex;
  align-items: center;
  height: 45px;
  &.selected {
    background-color: var(--button-hover-bg-color);
  }
  &.drag, &:hover {
    background-color: var(--button-active-bg-color);
  }
  &.drag {
    position: absolute;
    top: 0px;
    // pointer-events: none;
  }
  &.hide {
    visibility: hidden;
  }
  >.icon {
    padding: 0px 8px;
    height: 100%;
    width: 24px;
    background: no-repeat;
    background-position: center center;
    background-size: 12px;
    &.eye {
      background-size: 14px;
    }
    &.lock {
      background-size: 11px;
    }
    &.disabled {
      opacity: 0.3;
    }
  }
  >.image {
    min-width: 32px;
    height: 100%;
    margin: 0px 8px;
    background: no-repeat;
    background-position: center center;
    background-size: contain;
  }
}
</style>