<template>
  <li
    class="layer-cell-root"
    :class="{
      drag: drag,
      hide: hide,
      selected: selected
    }"
    @mousedown.left="mousedown($event)"
  >
    <div
      class="icon eye"
      ref="visibleIcon"
      :class="{
        disabled: !visible
      }"
    >
    </div>
    <div
      class="icon lock"
      ref="lockedIcon"
      :class="{
        disabled: !locked
      }"
    >
    </div>
    <!-- <div
      class="name"
    >
     {{name}}
    </div> -->
    <div
      :v-if="url"
      :style="{
        backgroundImage: `url(${url})`
      }"
      class="image"
    >
    </div>
    <!-- <div class="icon" @mousedown="startDrag(pPanel, $event)">
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
  pPanel: PPanel | null = null;
  @Prop()
  drag = false;
  @Prop()
  draggingPPanel!: PPanel;
  @Ref()
  visibleIcon!: HTMLElement;
  @Ref()
  lockedIcon!: HTMLElement;
  click: ClickChecker = new ClickChecker();
  mouseIsDown = false;
  async mounted() {
    window.addEventListener("mouseup", this.mouseup);
    window.addEventListener("mousemove", this.mousemove);
  }
  unmounted() {
    window.removeEventListener("mouseup", this.mouseup);
    window.removeEventListener("mousemove", this.mousemove);
  }
  get hide() {
    return this.draggingPPanel == this.pPanel;
  }
  get url() {
    return this.pPanel ? getImageURL(this.pPanel.petaPanel._petaImage, ImageType.THUMBNAIL) : undefined;
  }
  get selected() {
    return this.pPanel?.selected;
  }
  get locked() {
    return this.pPanel?.petaPanel.locked;
  }
  get visible() {
    return this.pPanel?.petaPanel.visible;
  }
  get name() {
    return this.pPanel?.petaPanel._petaImage?.name || "";
  }
  mousedown(event: MouseEvent) {
    this.click.down(vec2FromMouseEvent(event));
    this.mouseIsDown = true;
  }
  mouseup(event: MouseEvent) {
    this.mouseIsDown = false;
    if (this.click.isClick && this.pPanel) {
      if (event.target == this.visibleIcon) {
        this.pPanel.petaPanel.visible = !this.pPanel?.petaPanel.visible;
      } else if (event.target == this.lockedIcon) {
        this.pPanel.petaPanel.locked = !this.pPanel?.petaPanel.locked;
      }
    }
  }
  mousemove(event: MouseEvent) {
    if (!this.mouseIsDown) {
      return;
    }
    this.click.move(vec2FromMouseEvent(event));
    if (!this.click.isClick) {
      this.mouseIsDown = false;
      this.$emit("startDrag", this.pPanel, event);
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
  height: 64px;
  width: 100%;
  &.selected {
    background-color: var(--button-active-bg-color) !important;
  }
  &.drag, &:hover {
    background-color: var(--button-hover-bg-color);
  }
  &.drag {
    position: absolute;
    top: 0px;
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
    filter: var(--icon-filter);
    &.eye {
      background-size: 14px;
      background-image: url("~@/@assets/eye.png");
    }
    &.lock {
      background-size: 11px;
      background-image: url("~@/@assets/locked.png");
    }
    &.disabled {
      opacity: 0.3;
    }
  }
  >.image {
    min-width: 32px;
    height: 100%;
    margin: 0px 8px;
    flex: 1;
    background: no-repeat;
    background-position: center center;
    background-size: contain;
  }
  >.name {
    flex: 1;
    overflow: hidden;
    max-height: 100%;
    word-break: break-all;
  }
}
</style>