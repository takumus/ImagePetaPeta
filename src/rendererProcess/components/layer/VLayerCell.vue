<template>
  <li
    class="layer-cell-root"
    :class="{
      drag: drag,
      selected: selected
    }"
    @pointerdown.left="pointerdown($event)"
  >
    <t-icon
      class="visible"
      ref="visibleIcon"
      :class="{
        disabled: !visible
      }"
    >
    </t-icon>
    <t-icon
      class="lock"
      ref="lockedIcon"
      :class="{
        disabled: !locked
      }"
    >
    </t-icon>
    <!-- <div
      class="name"
    >
     {{name}}
    </div> -->
    <t-thumb
      :v-if="url"
      :style="{
        backgroundImage: `url(${url})`
      }"
    >
      <t-nsfw v-if="showNSFW"></t-nsfw>
    </t-thumb>
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
import { vec2FromPointerEvent } from "@/commons/utils/vec2";
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
  cellData: {
    id: number,
    data: PPanel
  } | null = null;
  // @Prop()
  // pPanel: PPanel | null = null;
  @Prop()
  drag = false;
  @Ref()
  visibleIcon!: HTMLElement;
  @Ref()
  lockedIcon!: HTMLElement;
  click: ClickChecker = new ClickChecker();
  mouseIsDown = false;
  async mounted() {
    window.addEventListener("pointerup", this.pointerup);
    window.addEventListener("pointermove", this.pointermove);
  }
  unmounted() {
    window.removeEventListener("pointerup", this.pointerup);
    window.removeEventListener("pointermove", this.pointermove);
  }
  get url() {
    return this.cellData ? getImageURL(this.cellData.data.petaPanel._petaImage, ImageType.THUMBNAIL) : undefined;
  }
  get selected() {
    return this.cellData?.data.selected;
  }
  get locked() {
    return this.cellData?.data.petaPanel.locked;
  }
  get visible() {
    return this.cellData?.data.petaPanel.visible;
  }
  get name() {
    return this.cellData?.data.petaPanel._petaImage?.name || "";
  }
  get showNSFW() {
    return this.cellData?.data.petaPanel._petaImage?.nsfw && !this.$nsfw.showNSFW;
  }
  pointerdown(event: PointerEvent) {
    this.click.down(vec2FromPointerEvent(event));
    this.mouseIsDown = true;
  }
  pointerup(event: PointerEvent) {
    this.mouseIsDown = false;
    if (this.click.isClick && this.cellData) {
      if (event.target === this.visibleIcon) {
        this.cellData.data.petaPanel.visible = !this.cellData.data?.petaPanel.visible;
      } else if (event.target === this.lockedIcon) {
        this.cellData.data.petaPanel.locked = !this.cellData.data?.petaPanel.locked;
      }
    }
  }
  pointermove(event: PointerEvent) {
    if (!this.mouseIsDown) {
      return;
    }
    this.click.move(vec2FromPointerEvent(event));
    if (!this.click.isClick) {
      this.mouseIsDown = false;
      this.$emit("startDrag", this.cellData, event);
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
  >t-icon {
    padding: 0px 8px;
    height: 100%;
    width: 24px;
    background: no-repeat;
    background-position: center center;
    background-size: 12px;
    display: block;
    filter: var(--icon-filter);
    &.visible {
      background-size: 14px;
      background-image: url("~@/@assets/visible.png");
    }
    &.lock {
      background-size: 11px;
      background-image: url("~@/@assets/locked.png");
    }
    &.disabled {
      opacity: 0.3;
    }
  }
  >t-thumb {
    min-width: 32px;
    height: 100%;
    margin: 0px 8px;
    flex: 1;
    background: no-repeat;
    background-position: center center;
    background-size: contain;
    display: block;
    >t-nsfw {
      width: 100%;
      height: 100%;
      display: block;
      background-size: 24px;
      background-position: center;
      background-repeat: repeat;
      background-image: url("~@/@assets/nsfwBackground.png");
    }
  }
  >.name {
    flex: 1;
    overflow: hidden;
    max-height: 100%;
    word-break: break-word;
  }
}
</style>