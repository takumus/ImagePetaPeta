<template>
  <li class="layer-cell-root" :class="{ drag: drag, hide: hide, selected: selected }">
    <div
      class="icon eye"
      :class="{
        disabled: !visible
      }"
      :style="{
        backgroundImage: `url(${eyeIcon})`
      }"
      @click="layerCellData.petaPanel.visible = !layerCellData.petaPanel.visible"
    >
    </div>
    <div
      class="icon lock"
      :class="{
        disabled: !locked
      }"
      :style="{
        backgroundImage: `url(${lockIcon})`
      }"
      @click="layerCellData.petaPanel.locked = !layerCellData.petaPanel.locked"
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
    <div class="icon" @mousedown="startDrag(layerCellData, $event)">
      =
    </div>
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
import LockIcon from "@/@assets/locked.png";
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
  async mounted() {
    //
  }
  unmounted() {
    //
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
  get eyeIcon() {
    return EyeIcon;
  }
  get lockIcon() {
    return LockIcon;
  }
  get locked() {
    return this.layerCellData?.petaPanel.locked;
  }
  get visible() {
    return this.layerCellData?.petaPanel.visible;
  }
  startDrag(layerCellData: PPanel, event: MouseEvent) {
    this.$emit("startDrag", layerCellData, event);
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
    margin: 0px 8px;
    width: 12px;
    height: 100%;
    background: no-repeat;
    background-position: center center;
    background-size: contain;
    &.eye {
      width: 14px;
    }
    &.lock {
      width: 11px;
    }
    &.disabled {
      opacity: 0.3;
    }
  }
  >.image {
    width: 32px;
    height: 100%;
    background: no-repeat;
    background-position: center center;
    background-size: contain;
  }
}
</style>