<template>
  <li class="layer-cell-root" :class="{ drag: drag, hide: hide }">
    <div class="icon">
      👁
    </div>
    <div
      v-if="layerCellData"
      :style="{
        backgroundImage: `url(${url})`
      }"
      class="image"
    >
    </div>
    <div class="icon" v-if="layerCellData">
      <input type="checkbox" v-model="layerCellData.selected" style="pointer-events: none">
    </div>
    <div class="icon">
      🔒
    </div>
    <div v-if="layerCellData" class="icon" @mousedown="startDrag(layerCellData, $event)">
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
    console.log(this.layerCellData?.petaPanel.id);
  }
  unmounted() {
    //
  }
  get hide() {
    return this.currentDraggingId == this.layerCellData?.petaPanel.id;
  }
  get url() {
    return getImageURL(this.layerCellData?.petaPanel._petaImage, ImageType.THUMBNAIL)
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
  padding: 8px;
  background-color: var(--button-bg-color);
  display: flex;
  align-items: center;
  &.selected {
    background-color: var(--button-active-bg-color);
  }
  &.drag, &:hover {
    background-color: var(--button-hover-bg-color);
  }
  &.drag {
    position: absolute;
    top: 0px;
    pointer-events: none;
  }
  &.hide {
    visibility: hidden;
  }
  >.icon {
    padding: 0px 8px;
  }
  >.image {
    width: 32px;
    height: 32px;
    background: no-repeat;
    background-position: center center;
    background-size: contain;
  }
}
</style>