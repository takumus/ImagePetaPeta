<template>
  <article
    class="crop-root"
    ref="cropRoot"
  >
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
import { PetaPanel } from "@/commons/datas/petaPanel";
import { PPanel } from "./ppanels/PPanel";
PIXILoader.registerPlugin(AnimatedGIFLoader);
@Options({
  components: {
  },
  emits: [
    "change"
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
  renderOrdered = false;
  requestAnimationFrameHandle = 0;
  stageRect = new Vec2();
  mousePosition = new Vec2();
  keyboards = new Keyboards();
  mounted() {
    this.pixi = new PIXI.Application({
      resolution: window.devicePixelRatio,
      antialias: true
    });
    this.pixi.stage.on("pointerdown", this.mousedown);
    this.pixi.stage.on("pointerup", this.mouseup);
    this.pixi.stage.on("pointerupoutside", this.mouseup);
    this.pixi.stage.on("pointermove", this.mousemove);
    this.pixi.stage.on("pointermoveoutside", this.mousemove);
    this.pixi.stage.addChild(this.rootContainer);
    this.cropRoot.appendChild(this.pixi.view);
    this.pixi.stage.interactive = true;
    this.pixi.ticker.stop();
    this.resizer = new ResizeObserver((entries) => {
      this.resize(entries[0]!.contentRect);
    });
    this.resizer.observe(this.cropRoot);
    this.renderPIXI();
    this.keyboards.enabled = true;
    this.changePetaPanel();
  }
  unmounted() {
    this.resizer?.unobserve(this.cropRoot);
    this.resizer?.disconnect();
    this.cropRoot.removeChild(this.pixi.view);
    this.pixi.destroy();
    this.keyboards.destroy();
    cancelAnimationFrame(this.requestAnimationFrameHandle);
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
    this.orderPIXIRender();
  }
  mousemove(e: PIXI.InteractionEvent) {
    this.mousePosition = new Vec2(e.data.global);
    this.click.move(this.mousePosition);
    this.orderPIXIRender();
  }
  updateRect() {
    //
  }
  animate() {
    //
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
  @Watch("petaPanel")
  changePetaPanel() {
    console.log(this.petaPanel);
    const pPanel = new PPanel(this.petaPanel);
    this.rootContainer.addChild(pPanel);
    (async () => {
      await pPanel.load();
      pPanel.update();
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
}
</style>