<template>
  <article
    class="layer-root"
    v-show="visible"
    :style=" {
      zIndex: zIndex
    }"
  >
    <section class="layer">
      <ul ref="layers">
        <li
          v-for="panelData in panelDatas"
          :key="panelData.id"
          :class="{
            dragging: draggingPanelId !== '',
            me: draggingPanelId == panelData.id,
            selected: panelData.pPanel.selected
          }"
          :ref="`panel-${panelData.id}`"
          @click.right="rightClick(panelData, $event)"
          @click.left="leftClick(panelData, $event)"
        >
          <div class="icon">
            👁
          </div>
          <div
            :style="{
              backgroundImage: `url(${panelData.imageURL})`
            }"
            class="image"
          >
          </div>
          <div class="icon">
            <input type="checkbox" v-model="panelData.pPanel.selected" style="pointer-events: none">
          </div>
          <div class="icon">
            🔒
          </div>
          <div class="icon" @mousedown="startDrag(panelData, $event)">
            ={{panelData.dragging}}
          </div>
        </li>
      </ul>
    </section>
  </article>
</template>

<script lang="ts">
// Vue
import { Options, Vue } from "vue-class-component";
import { Prop, Ref, Watch } from "vue-property-decorator";
// Others
import { v4 as uuid } from "uuid";
import { Keyboards } from "@/rendererProcess/utils/keyboards";
import { PetaBoard } from "@/commons/datas/petaBoard";
import { ImageType } from "@/commons/datas/imageType";
import { getImageURL } from "@/rendererProcess/utils/imageURL";
import { PetaPanel } from "@/commons/datas/petaPanel";
import { PPanel } from "../board/ppanels/PPanel";
import { vec2FromMouseEvent } from "@/commons/utils/vec2";
@Options({
  components: {
    //
  },
  emits: [
    "sortIndex",
    "petaPanelMenu"
  ]
})
export default class VLayer extends Vue {
  @Prop()
  visible = true;
  @Prop()
  zIndex = 0;
  @Prop()
  pPanelsArray!: PPanel[];
  @Ref()
  layers!: HTMLElement;
  keyboards = new Keyboards();
  draggingPanelId = "";
  startDragMouseY = 0;
  async mounted() {
    this.keyboards.enabled = true;
    this.keyboards.down(["escape"], this.pressEscape);
    this.layers.addEventListener("mousemove", this.mousemove);
    window.addEventListener("mouseup", this.mouseup);
  }
  unmounted() {
    this.keyboards.destroy();
    this.layers.removeEventListener("mousemove", this.mousemove);
    window.removeEventListener("mouseup", this.mouseup);
  }
  pressEscape(pressed: boolean) {
    //
  }
  startDrag(panelData: PanelData, event: MouseEvent) {
    this.draggingPanelId = panelData.id;
    this.startDragMouseY = event.clientY;
    const panelElement = this.$refs[`panel-${this.draggingPanelId}`] as HTMLElement | undefined;
    if (!panelElement) {
      return;
    }
    panelElement.style.top = "0px";
    this.clearSelectionAll(true);
    panelData.pPanel.selected = true;
  }
  mousemove(event: MouseEvent) {
    // console.log(event.offsetY);
    const panelElement = this.$refs[`panel-${this.draggingPanelId}`] as HTMLElement | undefined;
    if (!panelElement) {
      return;
    }
    panelElement.style.top = (event.clientY - this.startDragMouseY) + "px";
    let changed = false;
    [...this.panelDatas].sort((a, b) => {
      const aE = this.$refs[`panel-${a.id}`] as HTMLElement | undefined;
      const bE = this.$refs[`panel-${b.id}`] as HTMLElement | undefined;
      if (!aE || !bE) {
        return 0;
      }
      return bE.getBoundingClientRect().y - aE.getBoundingClientRect().y;
    }).forEach((panelData, index) => {
      if (panelData.pPanel.petaPanel.index != index) {
        changed = true;
      }
      panelData.pPanel.petaPanel.index = index;
    });
    if (changed) {
      this.$emit("sortIndex");
      console.log("changed");
      this.startDragMouseY = event.clientY;
    }
    panelElement.style.top = (event.clientY - this.startDragMouseY) + "px";
  }
  mouseup(event: MouseEvent) {
    this.draggingPanelId = "";
  }
  rightClick(panelData: PanelData, event: MouseEvent) {
    this.clearSelectionAll();
    panelData.pPanel.selected = true;
    this.$emit("petaPanelMenu", panelData.pPanel, vec2FromMouseEvent(event));
  }
  leftClick(panelData: PanelData, event: MouseEvent) {
    this.clearSelectionAll();
    panelData.pPanel.selected = true;
  }
  clearSelectionAll(force = false) {
    if (!Keyboards.pressed("shift") || force) {
      this.pPanelsArray.forEach((p) => {
        p.selected = false;
      });
    }
  }
  get panelDatas(): PanelData[] {
    if (!this.pPanelsArray) {
      return [];
    }
    return this.pPanelsArray.map((pPanel) => {
      return {
        pPanel,
        id: pPanel.petaPanel.id,
        imageURL: getImageURL(pPanel.petaPanel._petaImage, ImageType.THUMBNAIL)
      }
    }).sort((a, b) => {
      return b.pPanel.petaPanel.index - a.pPanel.petaPanel.index;
    });
  }
}
interface PanelData {
  pPanel: PPanel,
  id: string,
  imageURL: string,
}
</script>

<style lang="scss" scoped>
.layer-root {
  background-color: var(--bg-color);
  border-radius: var(--rounded);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  position: fixed;
  right: 0px;
  bottom: 0px;
  box-shadow: 0px 0px 3px 1px rgba(0, 0, 0, 0.4);
  margin: 16px;
  height: 50%;
  >.content {
    flex: 1;
    overflow: hidden;
  }
  >.layer{
    overflow-x: hidden;
    overflow-y: auto;
    height: 100%;
    >ul {
      margin: 0px;
      padding: 0px;
      position: relative;
      >li {
        cursor: pointer;
        margin: 0px;
        padding: 8px;
        background-color: var(--button-bg-color);
        display: flex;
        align-items: center;
        &.selected {
          background-color: var(--button-active-bg-color);
        }
        &.dragging.me, &:hover {
          background-color: var(--button-hover-bg-color);
        }
        &.dragging {
          pointer-events: none;
        }
        &.dragging.me {
          position: relative;
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
    }
  }
}
</style>