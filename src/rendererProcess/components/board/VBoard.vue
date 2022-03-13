<template>
  <article
    class="board-root"
    ref="boardRoot"
    v-show="board"
    :style="{
      backgroundColor: fillColor,
      zIndex: zIndex
    }"
  >
    <section
      ref="panelsBackground"
      class="panels-wrapper"
    >
    </section>
    <section
      class="crop"
      v-if="cropping"
    >
      <VCrop
        :petaPanel="croppingPetaPanel"
        @update="updateCrop"
      />
    </section>
    <section class="info">
      <span
        class="zoom"
        v-show="$settings.showFPS"
      >
        {{fps}}fps
      </span>
    </section>
    <VBoardLoading
      :zIndex="1"
      :loading="loading"
      :log="loadingLog"
      :progress="loadingProgress"
      ref="loadingModal"
    ></VBoardLoading>
  </article>
</template>

<script lang="ts">
// Vue
import { Options, Vue } from "vue-class-component";
import { Prop, Ref, Watch } from "vue-property-decorator";
// Components
import VCrop from "@/rendererProcess/components/board/VCrop.vue";
import VBoardLoading from "@/rendererProcess/components/board/VBoardLoading.vue";
// Others
import { Vec2, vec2FromMouseEvent } from "@/commons/utils/vec2";
import { PetaBoard, PetaBoardTransform } from "@/commons/datas/petaBoard";
import { PetaPanel } from "@/commons/datas/petaPanel";
import { MouseButton } from "@/commons/datas/mouseButton";
import { ClickChecker } from "@/rendererProcess/utils/clickChecker";
import { API, log } from "@/rendererProcess/api";
import { ImageType } from "@/commons/datas/imageType";
import * as PIXI from "pixi.js";
import { PPanel } from "@/rendererProcess/components/board/ppanels/PPanel";
import { PTransformer } from "@/rendererProcess/components/board/ppanels/PTransformer";
import { hitTest } from "@/rendererProcess/utils/hitTest";
import { BOARD_ZOOM_MAX, BOARD_ZOOM_MIN } from "@/commons/defines";
import { minimId } from "@/commons/utils/utils";
import { promiseSerial } from "@/commons/utils/promiseSerial";
import { Keyboards } from "@/rendererProcess/utils/keyboards";
import { Loader as PIXILoader } from '@pixi/loaders';
import { AnimatedGIFLoader } from '@pixi/gif';
PIXILoader.registerPlugin(AnimatedGIFLoader);
@Options({
  components: {
    VCrop,
    VBoardLoading
  },
  emits: [
    "change"
  ]
})
export default class VBoard extends Vue {
  @Prop()
  board?: PetaBoard;
  @Prop()
  zIndex = 0;
  @Ref("panelsBackground")
  panelsBackground!: HTMLElement;
  @Ref("loadingModal")
  loadingModal!: VBoardLoading;
  loading = false;
  loadingLog = "";
  loadingProgress = 0;
  croppingPetaPanel: PetaPanel | null = null;
  cropping = false;
  dragOffset = new Vec2();
  click = new ClickChecker();
  resizer?: ResizeObserver;
  pixi!: PIXI.Application;
  rootContainer = new PIXI.Container();
  centerWrapper = new PIXI.Container();
  panelsCenterWrapper = new PIXI.Container();
  backgroundSprite = new PIXI.Graphics();
  backgroundFilter = new PIXI.filters.ColorMatrixFilter();
  selectingBackground = new PIXI.Graphics();
  crossLine = new PIXI.Graphics();
  pPanels: {[key: string]: PPanel} = {};
  pTransformer = new PTransformer();
  dragging = false;
  draggingPanels = false;
  mouseLeftPressing = false;
  mouseRightPressing = false;
  renderOrdered = false;
  selecting = false;
  requestAnimationFrameHandle = 0;
  selection = {
    topLeft: new Vec2(),
    bottomRight: new Vec2()
  }
  selectionGraphics = new PIXI.Graphics();
  stageRect = new Vec2();
  mousePosition = new Vec2();
  frame = 0;
  fps = 0;
  keyboards = new Keyboards();
  cancel: (() => void) | undefined;
  mounted() {
    this.pixi = new PIXI.Application({
      resolution: window.devicePixelRatio,
      antialias: true
    });
    this.pixi.view.addEventListener("dblclick", this.resetTransform);
    this.pixi.view.addEventListener("mousewheel", this.wheel as any);
    this.pixi.stage.on("pointerdown", this.mousedown);
    this.pixi.stage.on("pointerup", this.mouseup);
    this.pixi.stage.on("pointerupoutside", this.mouseup);
    this.pixi.stage.on("pointermove", this.mousemove);
    this.pixi.stage.on("pointermoveoutside", this.mousemove);
    this.pixi.stage.on("pointerup", (e) => this.pTransformer.mouseup(e));
    this.pixi.stage.on("pointerupoutside", (e) => this.pTransformer.mouseup(e));
    this.pixi.stage.on("pointermove", (e) => this.pTransformer.mousemove(e));
    this.pixi.stage.on("pointermoveoutside", (e) => this.pTransformer.mousemove(e));
    this.pixi.stage.addChild(this.backgroundSprite);
    this.pixi.stage.addChild(this.crossLine);
    this.pixi.stage.addChild(this.centerWrapper);
    this.centerWrapper.addChild(this.rootContainer);
    this.rootContainer.addChild(this.panelsCenterWrapper);
    this.rootContainer.addChild(this.pTransformer);
    this.rootContainer.addChild(this.selectionGraphics);
    this.panelsBackground.appendChild(this.pixi.view);
    this.backgroundSprite.filters = [this.backgroundFilter];
    this.pixi.stage.interactive = true;
    this.pixi.ticker.stop();
    this.resizer = new ResizeObserver((entries) => {
      this.resize(entries[0]!.contentRect);
    });
    this.resizer.observe(this.panelsBackground);
    setInterval(() => {
      this.fps = this.frame;
      this.frame = 0;
    }, 1000);
    this.renderPIXI();
    this.keyboards.enabled = true;
    this.keyboards.down(["delete"], this.keyDelete);
    this.keyboards.down(["backspace"], this.keyBackspace);
    this.keyboards.change(["shift"], this.keyShift);
    PIXI.Ticker.shared.add(this.updateAnimatedGIF);
  }
  unmounted() {
    this.pixi.view.removeEventListener("dblclick", this.resetTransform);
    this.pixi.view.removeEventListener("mousewheel", this.wheel as any);
    this.resizer?.unobserve(this.panelsBackground);
    this.resizer?.disconnect();
    this.panelsBackground.removeChild(this.pixi.view);
    this.pixi.destroy();
    this.keyboards.destroy();
    PIXI.Ticker.shared.remove(this.updateAnimatedGIF);
    cancelAnimationFrame(this.requestAnimationFrameHandle);
  }
  resize(rect: DOMRectReadOnly) {
    this.stageRect.x = rect.width;
    this.stageRect.y = rect.height;
    this.pixi.renderer.resize(rect.width, rect.height);
    this.pixi.view.style.width = rect.width + "px";
    this.pixi.view.style.height = rect.height + "px";
    // this.panelsCenterWrapper.x = rect.width / 2;
    // this.panelsCenterWrapper.y = rect.height / 2 ;
    this.centerWrapper.x = rect.width / 2;
    this.centerWrapper.y = rect.height / 2;
    this.updateRect();
    this.orderPIXIRender();
  }
  mousedown(e: PIXI.InteractionEvent) {
    if (!this.board) {
      return;
    }
    this.click.down(e.data.global);
    if (e.data.button == MouseButton.RIGHT) {
      this.mouseRightPressing = true;
      this.dragging = true;
      this.dragOffset
      .set(this.board.transform.position)
      .sub(e.data.global);
    } else if (e.data.button == MouseButton.LEFT) {
      this.mouseLeftPressing = true;
      const pPanel = this.getPPanelFromObject(e.target);
      if (pPanel) {
        this.pointerdownPPanel(pPanel, e);
      } else if (e.target.name != "transformer") {
        this.clearSelectionAll();
        this.selecting = true;
        this.selection.topLeft = new Vec2(this.rootContainer.toLocal(e.data.global));
        this.selection.bottomRight = this.selection.topLeft.clone();
      }
    }
    this.orderPIXIRender();
  }
  getPPanelFromObject(object: PIXI.DisplayObject) {
    if (this.pPanelsArray.find((c) => c == object)) {
      return object as PPanel;
    }
    return null;
  }
  mouseup(e: PIXI.InteractionEvent) {
    if (e.data.button == MouseButton.RIGHT) {
      this.mouseRightPressing = false;
      if (this.click.isClick) {
        const pPanel = this.getPPanelFromObject(e.target);
        if (pPanel) {
          this.pointerdownPPanel(pPanel, e);
          this.selectedPPanels.forEach((pPanel) => pPanel.dragging = false);
          this.petaPanelMenu(pPanel, new Vec2(e.data.global));
        } else {
          this.$components.contextMenu.open([{
            label: this.$t("boards.menu.openBrowser"),
            click: () => {
              this.$components.browser.open();
            }
          }, { separate: true }, {
            label: this.$t("boards.menu.resetPosition"),
            click: () => {
              this.resetTransform();
            }
          }], new Vec2(e.data.global));
        }
      }
      this.dragging = false;
    } else if (e.data.button == MouseButton.LEFT) {
      this.mouseLeftPressing = false;
      this.pPanelsArray.forEach((pPanel) => {
        pPanel.dragging = false;
      });
      this.draggingPanels = false;
      this.selecting = false;
    }
    this.orderPIXIRender();
  }
  mousemove(e: PIXI.InteractionEvent) {
    this.mousePosition = new Vec2(e.data.global);
    this.click.move(this.mousePosition);
    if (this.mouseLeftPressing || this.mouseRightPressing || this.draggingPanels) {
      this.orderPIXIRender();
    }
  }
  wheel(event: WheelEvent) {
    if (!this.board) {
      return;
    }
    const mouse = vec2FromMouseEvent(event).sub(this.stageRect.clone().div(2));
    if (event.ctrlKey || this.$systemInfo.platform == "win32") {
      const currentZoom = this.board.transform.scale;
      this.board.transform.scale *= 1 + -event.deltaY * this.$settings.zoomSensitivity * 0.00001;
      if (this.board.transform.scale > BOARD_ZOOM_MAX) {
        this.board.transform.scale = BOARD_ZOOM_MAX;
      } else if (this.board.transform.scale < BOARD_ZOOM_MIN) {
        this.board.transform.scale = BOARD_ZOOM_MIN;
      }
      this.board.transform.position
      .mult(-1)
      .add(mouse)
      .mult(this.board.transform.scale / currentZoom)
      .sub(mouse)
      .mult(-1);
    } else {
      this.board.transform.position.add(
        new Vec2(event.deltaX, event.deltaY)
        .mult(this.$settings.moveSensitivity)
        .mult(-0.01)
      );
    }
    this.orderPIXIRender();
  }
  updateRect() {
    if (!this.board) {
      return;
    }
    this.crossLine.clear();
    this.crossLine.lineStyle(1, Number(this.board.background.lineColor.replace("#", "0x")), 1, undefined, true);
    this.crossLine.moveTo(-this.stageRect.x, 0);
    this.crossLine.lineTo(this.stageRect.x, 0);
    this.crossLine.moveTo(0, -this.stageRect.y);
    this.crossLine.lineTo(0, this.stageRect.y);
    this.backgroundSprite.clear();
    this.backgroundSprite.beginFill(Number(this.board.background.fillColor.replace("#", "0x")));
    this.backgroundSprite.drawRect(0, 0, this.stageRect.x, this.stageRect.y);
  }
  animate() {
    if (!this.board) {
      return;
    }
    this.frame++;
    this.pPanelsArray.filter((pPanel) => pPanel.dragging).forEach((pPanel) => {
      pPanel.petaPanel.position = new Vec2(this.panelsCenterWrapper.toLocal(this.mousePosition)).add(pPanel.draggingOffset);
    });
    if (this.dragging) {
      this.board.transform.position
      .set(this.mousePosition)
      .add(this.dragOffset);
    }
    if (this.selecting) {
      this.selection.bottomRight = new Vec2(this.rootContainer.toLocal(this.mousePosition));
    }
    this.board.transform.position.setTo(this.rootContainer);
    new Vec2(this.panelsCenterWrapper.toGlobal(new Vec2(0, 0))).setTo(this.crossLine);
    const offset = 0;
    if (this.crossLine.x < offset) {
      this.crossLine.x = offset;
    } else if (this.crossLine.x > this.stageRect.x - offset) {
      this.crossLine.x = this.stageRect.x - offset;
    }
    if (this.crossLine.y < offset) {
      this.crossLine.y = offset;
    } else if (this.crossLine.y > this.stageRect.y - offset) {
      this.crossLine.y = this.stageRect.y - offset;
    }
    this.rootContainer.scale.set(this.board.transform.scale);
    this.pTransformer.setScale(1 / this.board.transform.scale);
    this.selectionGraphics.clear();
    if (this.selecting) {
      const selection = {
        leftTop: new Vec2(
          Math.min(this.selection.topLeft.x, this.selection.bottomRight.x),
          Math.min(this.selection.topLeft.y, this.selection.bottomRight.y)
        ),
        rightTop: new Vec2(
          Math.max(this.selection.topLeft.x, this.selection.bottomRight.x),
          Math.min(this.selection.topLeft.y, this.selection.bottomRight.y)
        ),
        rightBottom: new Vec2(
          Math.max(this.selection.topLeft.x, this.selection.bottomRight.x),
          Math.max(this.selection.topLeft.y, this.selection.bottomRight.y)
        ),
        leftBottom: new Vec2(
          Math.min(this.selection.topLeft.x, this.selection.bottomRight.x),
          Math.max(this.selection.topLeft.y, this.selection.bottomRight.y)
        ),
      }
      this.selectionGraphics.lineStyle(1 / this.board.transform.scale, 0x000000, 1, undefined, true);
      this.selectionGraphics.beginFill(0xffffff, 0.1);
      this.selectionGraphics.drawRect(
        selection.leftTop.x,
        selection.leftTop.y,
        selection.rightBottom.x - selection.leftTop.x,
        selection.rightBottom.y - selection.leftTop.y
      );
      this.pPanelsArray.forEach((pPanel) => {
        const pPanelCorners = pPanel.getCorners().map((c) => {
          return new Vec2(this.rootContainer.toLocal(pPanel.toGlobal(c)));
        })
        pPanel.selected = hitTest(
          selection,
          {
            leftTop: pPanelCorners[0]!,
            rightTop: pPanelCorners[1]!,
            rightBottom: pPanelCorners[2]!,
            leftBottom: pPanelCorners[3]!
          }
        );
      });
    }
    this.pPanelsArray.forEach((pp) => {
      pp.unselected = false;
    });
    // this.setBackgroundBrightness(1);
    if (this.selectedPPanels.length > 0) {
      // this.setBackgroundBrightness(0.7);
      this.unselectedPPanels.forEach((pp) => {
        pp.unselected = true;
      });
    }
    this.pPanelsArray.forEach((pPanel) => {
      pPanel.update();
    });
    this.pTransformer.update();
  }
  resetTransform() {
    if (!this.board) {
      return;
    }
    this.board.transform.scale = 1;
    this.board.transform.position.set(0, 0);
    this.orderPIXIRender();
  }
  removeSelectedPanels() {
    if (!this.board) {
      return;
    }
    this.pPanelsArray.filter((pPanel) => pPanel.selected).forEach((pPanel) => {
      this.removePPanel(pPanel);
    })
    this.board.petaPanels = this.pPanelsArray.map((pPanel) => pPanel.petaPanel);
    this.orderPIXIRender();
  }
  removePPanel(pPanel: PPanel) {
    this.panelsCenterWrapper.removeChild(pPanel);
    pPanel.destroy();
    delete this.pPanels[pPanel.petaPanel.id];
  }
  petaPanelMenu(pPanel: PPanel, position: Vec2) {
    const isMultiple = this.selectedPPanels.length > 1;
    this.$components.contextMenu.open([
      {
        skip: isMultiple || !pPanel.isGIF,
        label: pPanel.isPlayingGIF ? this.$t("boards.panelMenu.stopGIF") : this.$t("boards.panelMenu.playGIF"),
        click: () => {
          if (pPanel.isPlayingGIF) {
            pPanel.stopGIF();
          } else {
            pPanel.playGIF();
          }
        }
      },
      {
        skip: isMultiple || !pPanel.isGIF,
        separate: true
      },
      {
        skip: isMultiple,
        label: this.$t("boards.panelMenu.crop"),
        click: () => {
          this.beginCrop(pPanel.petaPanel);
        }
      }, {
        skip: isMultiple,
        separate: true
      }, {
        label: this.$t("boards.panelMenu.flipHorizontal"),
        click: () => {
          this.selectedPPanels.forEach((pPanel) => {
            pPanel.petaPanel.width = -pPanel.petaPanel.width;
          });
        }
      }, {
        label: this.$t("boards.panelMenu.flipVertical"),
        click: () => {
          this.selectedPPanels.forEach((pPanel) => {
            pPanel.petaPanel.height = -pPanel.petaPanel.height;
          });
        }
      }, {
        separate: true
      }, {
        label: this.$t("boards.panelMenu.reset"),
        click: () => {
          this.selectedPPanels.forEach((pPanel) => {
            pPanel.petaPanel.height = Math.abs(pPanel.petaPanel.height);
            pPanel.petaPanel.width = Math.abs(pPanel.petaPanel.width);
            pPanel.petaPanel.crop.position.set(0, 0);
            pPanel.petaPanel.crop.width = 1;
            pPanel.petaPanel.crop.height = 1;
            pPanel.petaPanel.rotation = 0;
            this.updateCrop(pPanel.petaPanel);
          });
        }
      }, { separate: true }, {
        label: this.$t("boards.panelMenu.remove"),
        click: () => {
          this.removeSelectedPanels();
        }
      }
    ], position);
  }
  async addPanel(petaPanel: PetaPanel, offsetIndex: number){
    if (!this.board) {
      return;
    }
    this.endCrop();
    if (offsetIndex == 0) {
      this.clearSelectionAll();
    }
    this.loadOriginal(petaPanel);
    const offset = new Vec2(20, 20).mult(offsetIndex);
    const pPanel = this.pPanels[petaPanel.id];
    if (!pPanel) {
      return;
    }
    petaPanel.width *= 1 / this.board.transform.scale;
    petaPanel.height *= 1 / this.board.transform.scale;
    petaPanel.position = new Vec2(this.panelsCenterWrapper.toLocal(petaPanel.position.clone().add(offset)));
    pPanel.draggingOffset = offset.mult(1 / this.board.transform.scale);
    pPanel.dragging = true;
    pPanel.selected = true;
    this.draggingPanels = true;
    this.toFront(pPanel);
  }
  beginCrop(petaPanel: PetaPanel) {
    this.croppingPetaPanel = petaPanel;
    this.cropping = true;
  }
  endCrop() {
    this.croppingPetaPanel = null;
    this.cropping = false;
  }
  updateCrop(petaPanel: PetaPanel) {
    this.endCrop();
    if (!petaPanel._petaImage) {
      return;
    }
    const sign = 1;
    petaPanel.height = Math.abs(petaPanel.width * ((petaPanel.crop.height * petaPanel._petaImage.height) / (petaPanel.crop.width * petaPanel._petaImage.width))) * sign;
    this.orderPIXIRender();
  }
  clearSelectionAll(force = false) {
    if (!Keyboards.pressed("shift") || force) {
      this.pPanelsArray.forEach((p) => {
        p.selected = false;
      });
    }
  }
  toFront(pPanel: PPanel) {
    const maxIndex = this.getMaxIndex();
    pPanel.petaPanel.index = maxIndex + 1;
    this.sortIndex();
  }
  sortIndex() {
    if (!this.board) {
      return;
    }
    this.board.petaPanels
    .sort((a, b) => a.index - b.index)
    .forEach((petaPanel, i) => {
      petaPanel.index = i;
    });
    this.panelsCenterWrapper.children.sort((a, b) => {
      return (a as PPanel).petaPanel.index - (b as PPanel).petaPanel.index;
    });
  }
  getMaxIndex() {
    if (!this.board) {
      return -1;
    }
    return Math.max(...this.board.petaPanels.map((petaPanel) => petaPanel.index));
  }
  async load() {
    this.endCrop();
    if (!this.board) {
      return;
    }
    log("vBoard", "load", this.board.name);
    this.loading = true;
    // this.clearCache();
    this.pPanelsArray.forEach((pPanel) => {
      this.removePPanel(pPanel);
    });
    this.pPanels = {};
    this.pTransformer.pPanels = this.pPanels;
    try {
      await this.loadAllOriginal();
      this.orderPIXIRender();
      Object.values(this.pPanels).forEach((pPanel) => {
        if (!pPanel.petaPanel.gif.stopped) {
          pPanel.playGIF();
        }
      });
      this.loading = false;
      this.loadingProgress = 0;
      this.loadingLog = "";
    } catch (error) {
      log("vBoard", "error", error);
    }
  }
  async loadAllOriginal() {
    if (this.cancel) {
      this.cancel();
    }
    if (!this.board) {
      return;
    }
    const load = async (petaPanel: PetaPanel, index: number) => {
      if (!this.board) {
        return;
      }
      const progress =  `${index + 1}/${this.board.petaPanels.length}`;
      await this.loadOriginal(petaPanel).then((result) => {
        if (result) {
          log("vBoard", `loaded(${minimId(petaPanel._petaImage?.id)}):`, progress);
          this.loadingLog = `loaded(${minimId(petaPanel._petaImage?.id)}):${progress}\n` + this.loadingLog;
        }
      }).catch((err) => {
        log("vBoard", `loderr(${minimId(petaPanel._petaImage?.id)}):`, progress, err);
        this.loadingLog = `loaderr(${minimId(petaPanel._petaImage?.id)}):${progress}\n` + this.loadingLog;
      });
      this.loadingProgress = ((index + 1) / this.board.petaPanels.length) * 100;
      this.orderPIXIRender();
    }
    try {
      const result = promiseSerial(load, [...this.board.petaPanels]);
      this.cancel = result.cancel;
      await result.value;
      this.cancel = undefined;
    } catch (err) {
      throw "canceled";
    }
  }
  async loadOriginal(petaPanel: PetaPanel) {
    if (this.pPanels[petaPanel.id]) {
      return false;
    }
    const pPanel = new PPanel(petaPanel);
    pPanel.showNsfw = this.$settings.showNsfwWithoutConfirm;
    pPanel.onUpdateGIF = () => {
      this.orderPIXIRender();
    }
    this.pPanels[petaPanel.id] = pPanel;
    this.panelsCenterWrapper.addChild(pPanel);
    await pPanel.load();
    pPanel.update();
    this.orderPIXIRender();
    return pPanel;
  }
  clearCache() {
    PIXI.utils.destroyTextureCache();
    PIXI.utils.clearTextureCache();
  }
  pointerdownPPanel(pPanel: PPanel, e: PIXI.InteractionEvent) {
    if (!this.board) {
      return;
    }
    if (!Keyboards.pressed("shift") && (this.selectedPPanels.length <= 1 || !pPanel.selected)) {
      // シフトなし。かつ、(１つ以下の選択か、自身が未選択の場合)
      // 最前にして選択リセット
      this.toFront(pPanel);
      this.clearSelectionAll();
    }
    if (this.selectedPPanels.length <= 1) {
      // 選択が１つ以下の場合選択範囲リセット
      this.clearSelectionAll();
    }
    pPanel.selected = true;
    this.draggingPanels = true;
    const maxIndex = this.getMaxIndex();
    this.selectedPPanels.forEach((pPanel) => {
      const pos = new Vec2(e.data.global);
      pPanel.draggingOffset = new Vec2(pPanel.position).sub(this.panelsCenterWrapper.toLocal(pos));
      pPanel.dragging = true;
      pPanel.petaPanel.index += maxIndex;
    });
    this.sortIndex();
  }
  setBackgroundBrightness(value: number) {
    this.backgroundFilter.brightness(value, false);
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
  updateAnimatedGIF(deltaTime: number) {
    Object.values(this.pPanels).forEach((pPanel) => {
      if (pPanel.isGIF) {
        pPanel.updateGIF(deltaTime);
      }
    });
  }
  keyDelete() {
    this.removeSelectedPanels();
  }
  keyBackspace() {
    this.removeSelectedPanels();
  }
  keyShift(pressed: boolean) {
    this.pTransformer.fit = pressed;
  }
  get pPanelsArray() {
    return Object.values(this.pPanels);
  }
  get selectedPPanels() {
    return this.pPanelsArray.filter((pPanel) => pPanel.selected);
  }
  get unselectedPPanels() {
    return this.pPanelsArray.filter((pPanel) => !pPanel.selected);
  }
  get scalePercent() {
    if (!this.board) {
      return 100;
    }
    return Math.floor(this.board.transform.scale * 100);
  }
  get fillColor() {
    if (!this.board) {
      return "#ff0000";
    }
    return this.board.background.fillColor;
  }
  @Watch("$settings.showNsfwWithoutConfirm")
  changeShowNsfwWithoutConfirm() {
    this.pPanelsArray.forEach((pp) => {
      pp.showNsfw = this.$settings.showNsfwWithoutConfirm;
    });
  }
  @Watch("board.petaPanels", { deep: true })
  changeBoardPetaPanels() {
    this.$emit("change", this.board);
  }
  @Watch("board.transform", { deep: true })
  changeBoardTransform() {
    this.updateRect();
    this.$emit("change", this.board);
  }
  @Watch("board.background", { deep: true })
  changeBoardBackground() {
    this.updateRect();
    this.$emit("change", this.board);
    this.orderPIXIRender();
  }
  @Watch("board.name")
  changeBoardName() {
    this.$emit("change", this.board);
  }
  @Watch("board.index")
  changeBoardIndex() {
    this.$emit("change", this.board);
  }
  @Watch("board")
  changeBoard() {
    this.load();
  }
}
</script>

<style lang="scss" scoped>
.board-root {
  position: absolute;
  top: 0px;
  left: 0px;
  width: 100%;
  height: 100%;
  >.panels-wrapper {
    position: absolute;
    top: 0px;
    left: 0px;
    width: 100%;
    height: 100%;
    z-index: 1;
  }
  >.crop {
    position: absolute;
    z-index: 3;
    top: 0px;
    left: 0px;
    width: 100%;
    height: 100%;
  }
  >.info {
    position: absolute;
    z-index: 2;
    bottom: 0px;
    right: 0px;
    padding: 8px;
    height: 40px;
    display: flex;
    >.zoom {
      display: block;
      padding: 4px;
      border-radius: var(--rounded);
      background-color: var(--bg-color);
      border: solid 1px var(--border-color);
      height: 100%;
      width: 50px;
      text-align: center;
      margin-left: 8px;
    }
    >input {
      display: block;
      margin-left: 8px;
      border-radius: var(--rounded);
      border: solid 1px var(--border-color);
      height: 100%;
      width: 50px;
      background-color: var(--bg-color);
    }
  }
}
</style>