<template>
  <article
    class="crop-root"
    ref="cropRoot"
  >
  <section
    class="buttons"
  >
    <button @click="updateCrop">{{$t("boards.crop.apply")}}</button>
    <button @click="resetCrop">{{$t("boards.crop.reset")}}</button>
    <button @click="cancelCrop">{{$t("boards.crop.cancel")}}</button>
  </section>
  </article>
</template>

<script lang="ts">
// Vue
import { Options, Vue } from "vue-class-component";
import { Prop, Ref, Watch } from "vue-property-decorator";
// Components

// Others
import { Vec2, vec2FromMouseEvent } from "@/commons/utils/vec2";
import { ClickChecker } from "@/rendererProcess/utils/clickChecker";
import * as PIXI from "pixi.js";
import { Keyboards } from "@/rendererProcess/utils/keyboards";
import { Loader as PIXILoader } from '@pixi/loaders';
import { AnimatedGIFLoader } from '@pixi/gif';
import { createPetaPanel, PetaPanel } from "@/commons/datas/petaPanel";
import { PPanel } from "@/rendererProcess/components/board/ppanels/PPanel";
import { PSelection } from "@/rendererProcess/components/board/ppanels/PSelection";
import { PControlPoint } from "@/rendererProcess/components/board/ppanels/PControlPoint";
PIXILoader.registerPlugin(AnimatedGIFLoader);
@Options({
  components: {
  },
  emits: [
    "update"
  ]
})
export default class VBoard extends Vue {
  @Ref("cropRoot")
  cropRoot!: HTMLElement;
  @Prop()
  petaPanel!: PetaPanel;
  click = new ClickChecker();
  resizer?: ResizeObserver;
  pixi!: PIXI.Application;
  rootContainer = new PIXI.Container();
  selectionContainer = new PIXI.Container();
  renderOrdered = false;
  requestAnimationFrameHandle = 0;
  stageRect = new Vec2();
  mousePosition = new Vec2();
  prevMousePosition = new Vec2();
  keyboards = new Keyboards();
  selection: PSelection = new PSelection();
  pPanel: PPanel | undefined;
  corners: PControlPoint[] = [];
  blackMask = new PIXI.Graphics();
  draggingControlPoint: PControlPoint | undefined;
  minX = 0;
  maxX = 0;
  minY = 0;
  maxY = 0;
  dragging = false;
  mounted() {
    this.pixi = new PIXI.Application({
      resolution: window.devicePixelRatio,
      antialias: true,
      backgroundAlpha: 0
    });
    this.pixi.stage.on("pointerdown", this.mousedown);
    this.pixi.stage.on("pointerup", this.mouseup);
    this.pixi.stage.on("pointerupoutside", this.mouseup);
    this.pixi.stage.on("pointermove", this.mousemove);
    this.pixi.stage.on("pointermoveoutside", this.mousemove);
    this.pixi.stage.interactive = true;
    this.pixi.ticker.stop();
    this.pixi.stage.addChild(this.rootContainer);
    this.cropRoot.appendChild(this.pixi.view);
    this.rootContainer.addChild(this.blackMask, this.selectionContainer);
    this.selectionContainer.addChild(this.selection);
    this.selection.interactive = true;
    this.selection.on("pointerdown", this.beginMoveSelection);
    for (let i = 0; i < 8; i++) {
      const cp = new PControlPoint();
      cp.rotate.interactive = false;
      if (i != 3 && i != 7) {
        if (i == 0 || i == 1 || i == 2) {
          cp.yPosition = -1;
        } else {
          cp.yPosition = 1;
        }
      } else {
        cp.yPosition = 0;
      }
      if (i != 1 && i != 5) {
        if (i == 2 || i == 3 || i == 4) {
          cp.xPosition = 1;
        } else {
          cp.xPosition = -1;
        }
      } else {
        cp.xPosition = 0;
      }
      cp.size.on("pointerdown", (e) => {
        this.startDrag(e, cp);
      });
      this.corners.push(cp);
    }
    this.selectionContainer.addChild(...this.corners);
    PIXI.Ticker.shared.add(this.updateAnimatedGIF);
    this.resizer = new ResizeObserver((entries) => {
      this.resize(entries[0]!.contentRect);
    });
    this.resizer.observe(this.cropRoot);
    this.renderPIXI();
    this.keyboards.enabled = true;
    this.changePetaPanel();
  }
  startDrag(e: PIXI.InteractionEvent, controlPoint: PControlPoint) {
    this.draggingControlPoint = controlPoint;
  }
  beginMoveSelection(e: PIXI.InteractionEvent) {
    this.prevMousePosition = new Vec2(e.data.global);
    this.dragging = true;
  }
  unmounted() {
    this.resizer?.unobserve(this.cropRoot);
    this.resizer?.disconnect();
    this.cropRoot.removeChild(this.pixi.view);
    this.pixi.destroy();
    this.keyboards.destroy();
    cancelAnimationFrame(this.requestAnimationFrameHandle);
    PIXI.Ticker.shared.remove(this.updateAnimatedGIF);
  }
  resize(rect: DOMRectReadOnly) {
    this.stageRect.x = rect.width;
    this.stageRect.y = rect.height;
    this.pixi.renderer.resize(rect.width, rect.height);
    this.pixi.view.style.width = rect.width + "px";
    this.pixi.view.style.height = rect.height + "px";
    this.rootContainer.x = rect.width / 2;
    this.rootContainer.y = rect.height / 2 ;
    this.updateRect();
    this.orderPIXIRender();
  }
  mousedown(e: PIXI.InteractionEvent) {
    this.orderPIXIRender();
  }
  mouseup(e: PIXI.InteractionEvent) {
    this.draggingControlPoint = undefined;
    this.orderPIXIRender();
    this.dragging = false;
  }
  mousemove(e: PIXI.InteractionEvent) {
    this.mousePosition = new Vec2(e.data.global);
    if (this.draggingControlPoint) {
      const pos = this.selectionContainer.toLocal(this.mousePosition);
      if (this.draggingControlPoint.xPosition == -1) {
        this.minX = pos.x / this.width;
      }
      if (this.draggingControlPoint.xPosition == 1) {
        this.maxX = pos.x / this.width;
      }
      if (this.draggingControlPoint.yPosition == -1) {
        this.minY = pos.y / this.height;
      }
      if (this.draggingControlPoint.yPosition == 1) {
        this.maxY = pos.y / this.height;
      }
    }
    const minX = Math.min(this.minX, this.maxX);
    const maxX = Math.max(this.minX, this.maxX);
    const minY = Math.min(this.minY, this.maxY);
    const maxY = Math.max(this.minY, this.maxY);
    this.minX = minX;
    this.maxX = maxX;
    this.minY = minY;
    this.maxY = maxY;
    if (this.minX < 0) {
      this.minX = 0;
    }
    if (this.maxX > 1) {
      this.maxX = 1;
    }
    if (this.minY < 0) {
      this.minY = 0;
    }
    if (this.maxY > 1) {
      this.maxY = 1;
    }
    this.selection.hitArea = new PIXI.Rectangle(
      this.minX * this.width,
      this.minY * this.height,
      (this.maxX - this.minX) * this.width,
      (this.maxY - this.minY) * this.height
    );
    if (this.dragging) {
      const diff = this.mousePosition.clone().sub(this.prevMousePosition);
      this.prevMousePosition = this.mousePosition.clone();
      diff.x /= this.width;
      diff.y /= this.height;
      this.minX += diff.x;
      this.maxX += diff.x;
      this.minY += diff.y;
      this.maxY += diff.y;
    }
    this.click.move(this.mousePosition);
    this.orderPIXIRender();
  }
  updateAnimatedGIF(deltaTime: number) {
    if (this.pPanel?.isGIF) {
      this.pPanel.updateGIF(deltaTime);
    }
  }
  updateRect() {
    //
  }
  animate() {
    if (!this.pPanel) {
      return;
    }
    if (!this.petaPanel._petaImage) {
      return;
    }
    this.selection.setCorners(this.sevenCorners);
    this.selection.update();
    this.pPanel.position.x = 0;
    this.pPanel.position.y = 0;
    this.pPanel.petaPanel.width = this.width;
    this.pPanel.petaPanel.height = this.height;
    this.selectionContainer.x = -this.pPanel.petaPanel.width / 2;
    this.selectionContainer.y = -this.pPanel.petaPanel.height / 2;
    this.pPanel.update();
    this.corners.forEach((corner, i) => {
      this.sevenCorners[i]?.setTo(corner);
    });
    this.blackMask.x = -this.rootContainer.x;
    this.blackMask.y = -this.rootContainer.y;
    const topLeft = new Vec2(this.selection.toGlobal(new Vec2(this.minX * this.width, this.minY * this.height)));
    const bottomRight = new Vec2(topLeft).add(new Vec2((this.maxX - this.minX) * this.width, (this.maxY - this.minY) * this.height));
    this.blackMask.clear();
    this.blackMask.beginFill(0x000000, 0.5);
    this.blackMask.drawRect(
      0,
      0,
      this.stageRect.x,
      topLeft.y
    );
    this.blackMask.drawRect(
      0,
      bottomRight.y,
      this.stageRect.x,
      this.stageRect.y - bottomRight.y
    );
    this.blackMask.drawRect(
      0,
      topLeft.y,
      topLeft.x,
      bottomRight.y - topLeft.y
    );
    this.blackMask.drawRect(
      bottomRight.x,
      topLeft.y,
      this.stageRect.x - bottomRight.x,
      bottomRight.y - topLeft.y
    );
  }
  orderPIXIRender() {
    this.renderOrdered = true;
  }
  renderPIXI() {
    if (this.renderOrdered) {
      this.animate();
      this.pixi.render();
      this.renderOrdered = false;
    }
    this.requestAnimationFrameHandle = requestAnimationFrame(this.renderPIXI);
  }
  updateCrop() {
    this.petaPanel.crop.position.x = this.minX;
    this.petaPanel.crop.position.y = this.minY;
    this.petaPanel.crop.width = this.maxX - this.minX;
    this.petaPanel.crop.height = this.maxY - this.minY;
    this.$emit("update", this.petaPanel);
  }
  cancelCrop() {
    this.$emit("update", this.petaPanel);
  }
  resetCrop() {
    this.minX = 0;
    this.minY = 0;
    this.maxX = 1;
    this.maxY = 1;
    this.orderPIXIRender();
  }
  get height() {
    return this.width * (this.petaPanel._petaImage?.height || 0);
  }
  get width() {
    if (!this.pPanel || !this.petaPanel._petaImage) {
      return 0;
    }
    let width = 0;
    let height = 0;
    const maxWidth = this.stageRect.x * 0.95;
    const maxHeight = this.stageRect.y * 0.70;
    if (this.petaPanel._petaImage.height / this.petaPanel._petaImage.width < maxHeight / maxWidth) {
      width = maxWidth;
      height = maxWidth * this.petaPanel._petaImage.height;
    } else {
      height = maxHeight;
      width = maxHeight / this.petaPanel._petaImage.height;
    }
    return width;
  }
  get sevenCorners() {
    const corners = [
      new Vec2(this.minX, this.minY),
      new Vec2((this.maxX + this.minX) / 2, this.minY),
      new Vec2(this.maxX, this.minY),
      new Vec2(this.maxX, (this.maxY + this.minY) / 2),
      new Vec2(this.maxX, this.maxY),
      new Vec2((this.maxX + this.minX) / 2, this.maxY),
      new Vec2(this.minX, this.maxY),
      new Vec2(this.minX, (this.maxY + this.minY) / 2),
    ];
    return corners.map((p) => new Vec2(
      p.x * this.width,
      p.y * this.height
    ));
  }
  @Watch("petaPanel")
  changePetaPanel() {
    if (!this.petaPanel._petaImage) {
      return;
    }
    const petaPanel = createPetaPanel(this.petaPanel._petaImage, new Vec2(0, 0), 400);
    this.minX = this.petaPanel.crop.position.x;
    this.minY = this.petaPanel.crop.position.y;
    this.maxX = this.petaPanel.crop.width + this.petaPanel.crop.position.x;
    this.maxY = this.petaPanel.crop.height + this.petaPanel.crop.position.y;
    if (!this.pPanel) {
      this.pPanel = new PPanel(petaPanel);
      this.pPanel.onUpdateGIF = () => {
        this.orderPIXIRender();
      }
      this.rootContainer.addChildAt(this.pPanel, 0);
    } else {
      this.pPanel.setPetaPanel(petaPanel);
    }
    (async () => {
      if (!this.pPanel) {
        return;
      }
      await this.pPanel.load();
      this.pPanel.playGIF();
    })();
  }
}
</script>

<style lang="scss" scoped>
.crop-root {
  position: absolute;
  top: 0px;
  left: 0px;
  width: 100%;
  height: 100%;
  background-repeat: repeat;
  background-image: url("~@/@assets/transparentBackground.png");
  >.buttons {
    display: block;
    position: absolute;
    transform: translateX(-50%);
    bottom: 8px;
    left: 50%;
  }
}
</style>