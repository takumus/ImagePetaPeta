<template>
  <t-board-root
    ref="boardRoot"
    v-show="board"
    :style="{
      zIndex: zIndex
    }"
  >
    <t-pixi-container
      ref="panelsBackground"
      class="panels-wrapper"
    >
    </t-pixi-container>
    <t-crop
      v-if="cropping"
    >
      <VCrop
        :petaPanel="croppingPetaPanel"
        @update="updateCrop"
      />
    </t-crop>
    <VBoardLoading
      :zIndex="2"
      :loading="loading"
      :log="loadingLog"
      :progress="loadingProgress"
      ref="loadingModal"
    ></VBoardLoading>
    <VLayer
      ref="layer"
      v-show="!detailsMode"
      :zIndex="1"
      :visible="true"
      :pPanelsArray="pPanelsArray"
      @sortIndex="sortIndex"
      @petaPanelMenu="petaPanelMenu"
      @update="orderPIXIRender"
    />
  </t-board-root>
</template>

<script lang="ts">
// Vue
import { Options, Vue } from "vue-class-component";
import { Prop, Ref, Watch } from "vue-property-decorator";
// Components
import VCrop from "@/rendererProcess/components/board/VCrop.vue";
import VBoardLoading from "@/rendererProcess/components/board/VBoardLoading.vue";
import VLayer from "@/rendererProcess/components/layer/VLayer.vue";
// Others
import { Vec2, vec2FromPointerEvent } from "@/commons/utils/vec2";
import { PetaBoard } from "@/commons/datas/petaBoard";
import { PetaPanel } from "@/commons/datas/petaPanel";
import { MouseButton } from "@/commons/datas/mouseButton";
import { ClickChecker } from "@/rendererProcess/utils/clickChecker";
import * as PIXI from "pixi.js";
import { PPanel } from "@/rendererProcess/components/board/ppanels/PPanel";
import { PTransformer } from "@/rendererProcess/components/board/ppanels/PTransformer";
import { hitTest } from "@/rendererProcess/utils/hitTest";
import { BOARD_ZOOM_MAX, BOARD_ZOOM_MIN } from "@/commons/defines";
import { minimId } from "@/commons/utils/utils";
import { promiseSerial } from "@/commons/utils/promiseSerial";
import { Keyboards } from "@/rendererProcess/utils/keyboards";
import { Loader as PIXILoader } from '@pixi/loaders';
import { AnimatedGIFLoader } from '@/rendererProcess/utils/pixi-gif';
import * as Cursor from "@/rendererProcess/utils/cursor";
import { logChunk } from "@/rendererProcess/utils/rendererLogger";
import { Rectangle } from "pixi.js";
import { API } from "@/rendererProcess/api";
import { WindowType } from "@/commons/datas/windowType";
import w from "@/rendererProcess/utils/pixi-gif/decompress.worker";
// PIXILoader.registerPlugin(AnimatedGIFLoader);
@Options({
  components: {
    VCrop,
    VBoardLoading,
    VLayer,
  },
  emits: [
    "change"
  ]
})
export default class VBoard extends Vue {
  @Prop()
  detailsMode = false;
  @Prop()
  board?: PetaBoard;
  @Prop()
  zIndex = 0;
  @Ref("panelsBackground")
  panelsBackground!: HTMLElement;
  @Ref("loadingModal")
  loadingModal!: VBoardLoading;
  @Ref()
  layer!: VLayer;
  loading = false;
  loadingLog = "";
  loadingProgress = 0;
  croppingPetaPanel: PetaPanel | null = null;
  cropping = false;
  dragOffset = new Vec2();
  click = new ClickChecker();
  resizer?: ResizeObserver;
  pixi?: PIXI.Application;
  rootContainer = new PIXI.Container();
  centerWrapper = new PIXI.Container();
  panelsCenterWrapper = new PIXI.Container();
  backgroundSprite = new PIXI.Graphics();
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
  keyboards?: Keyboards;
  cancel: (() => Promise<void[]>) | undefined;
  resolution = -1;
  resolutionMatchMedia = matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
  mouseOffset = new Vec2();
  mounted() {
    setTimeout(() => {
      this.constructIfResolutionChanged();
    }, 200);
    this.resolutionMatchMedia.addEventListener("change", this.constructIfResolutionChanged);
  }
  unmounted() {
    this.destruct();
    this.resolutionMatchMedia.removeEventListener("change", this.constructIfResolutionChanged);
  }
  constructIfResolutionChanged() {
    if (this.resolution != window.devicePixelRatio) {
      this.destruct();
      this.construct();
      this.resolution = window.devicePixelRatio;
    }
  }
  construct() {
    logChunk().log("construct PIXI");
    PIXI.settings.MIPMAP_TEXTURES = PIXI.MIPMAP_MODES.OFF;
    this.pixi = new PIXI.Application({
      resolution: window.devicePixelRatio,
      antialias: true,
      backgroundAlpha: 0
    });
    this.pixi.view.addEventListener("dblclick", this.resetTransform);
    this.pixi.view.addEventListener("mousewheel", this.wheel as any);
    this.pixi.view.addEventListener("pointerdown", this.preventWheelClick);
    this.pixi.stage.on("pointerdown", this.pointerdown);
    this.pixi.stage.on("pointerup", this.pointerup);
    this.pixi.stage.on("pointerupoutside", this.pointerup);
    this.pixi.stage.on("pointermove", this.pointermove);
    this.pixi.stage.on("pointermoveoutside", this.pointermove);
    this.pixi.stage.on("pointerup", (e) => this.pTransformer.pointerup(e));
    this.pixi.stage.on("pointerupoutside", (e) => this.pTransformer.pointerup(e));
    this.pixi.stage.on("pointermove", (e) => this.pTransformer.pointermove(e));
    this.pixi.stage.on("pointermoveoutside", (e) => this.pTransformer.pointermove(e));
    if (!this.detailsMode) {
      this.pixi.stage.addChild(this.backgroundSprite);
      this.pixi.stage.addChild(this.crossLine);
    }
    this.pixi.stage.addChild(this.centerWrapper);
    this.centerWrapper.addChild(this.rootContainer);
    this.rootContainer.addChild(this.panelsCenterWrapper);
    this.rootContainer.addChild(this.pTransformer);
    this.rootContainer.addChild(this.selectionGraphics);
    this.panelsBackground.appendChild(this.pixi.view);
    this.pixi.stage.interactive = true;
    this.pixi.ticker.stop();
    this.resizer = new ResizeObserver((entries) => {
      this.resize(entries[0]!.contentRect);
    });
    this.resizer.observe(this.panelsBackground);
    this.renderPIXI();
    this.keyboards = new Keyboards();
    this.keyboards.enabled = !this.detailsMode;
    this.keyboards.down(["delete"], this.keyDelete);
    this.keyboards.down(["backspace"], this.keyBackspace);
    this.keyboards.change(["shift"], this.keyShift);
    PIXI.Ticker.shared.add(this.updateAnimatedGIF);
  }
  destruct() {
    if (this.pixi) {
      logChunk().log("destruct PIXI");
      this.pixi.view.removeEventListener("dblclick", this.resetTransform);
      this.pixi.view.removeEventListener("mousewheel", this.wheel as any);
      this.pixi.view.removeEventListener("pointerdown", this.preventWheelClick);
      this.pixi.destroy(true);
    }
    this.resizer?.unobserve(this.panelsBackground);
    this.resizer?.disconnect();
    this.keyboards?.destroy();
    PIXI.Ticker.shared.remove(this.updateAnimatedGIF);
    cancelAnimationFrame(this.requestAnimationFrameHandle);
  }
  resize(rect: DOMRectReadOnly) {
    this.stageRect.x = rect.width;
    this.stageRect.y = rect.height;
    this.mouseOffset.set(this.panelsBackground.getBoundingClientRect());
    this.updateDetailsPetaPanel();
    if (this.pixi) {
      this.pixi.renderer.resize(rect.width, rect.height);
      this.pixi.view.style.width = rect.width + "px";
      this.pixi.view.style.height = rect.height + "px";
    }
    // this.panelsCenterWrapper.x = rect.width / 2;
    // this.panelsCenterWrapper.y = rect.height / 2 ;
    this.centerWrapper.x = rect.width / 2;
    this.centerWrapper.y = rect.height / 2;
    this.updateRect();
    this.orderPIXIRender();
    this.renderPIXI();
    this.orderPIXIRender();
  }
  preventWheelClick(event: PointerEvent) {
    if (event.button === MouseButton.MIDDLE) {
      event.preventDefault();
    }
  }
  pointerdown(e: PIXI.InteractionEvent) {
    if (!this.board) {
      return;
    }
    const mouse = this.getMouseFromEvent(e);
    this.click.down(mouse);
    if (e.data.button === MouseButton.RIGHT || e.data.button === MouseButton.MIDDLE || (this.detailsMode && e.data.button === MouseButton.LEFT)) {
      this.mouseRightPressing = true;
      this.dragging = true;
      this.dragOffset
      .set(this.board.transform.position)
      .sub(mouse);
    } else if (e.data.button === MouseButton.LEFT) {
      this.mouseLeftPressing = true;
      const pPanel = this.getPPanelFromObject(e.target);
      if (pPanel) {
        this.pointerdownPPanel(pPanel, e);
      } else if (e.target.name != "transformer") {
        this.clearSelectionAll();
        this.selecting = true;
        this.selection.topLeft = new Vec2(this.rootContainer.toLocal(mouse));
        this.selection.bottomRight = this.selection.topLeft.clone();
      }
    }
    this.orderPIXIRender();
  }
  getPPanelFromObject(object: PIXI.DisplayObject) {
    if (this.pPanelsArray.find((c) => c === object)) {
      return object as PPanel;
    }
    return null;
  }
  pointerup(e: PIXI.InteractionEvent) {
    const mouse = this.getMouseFromEvent(e).add(this.mouseOffset);
    if (e.data.button === MouseButton.RIGHT || e.data.button === MouseButton.MIDDLE || (this.detailsMode && e.data.button === MouseButton.LEFT)) {
      this.mouseRightPressing = false;
      if (this.click.isClick && e.data.button === MouseButton.RIGHT) {
        const pPanel = this.getPPanelFromObject(e.target);
        if (pPanel) {
          this.pointerdownPPanel(pPanel, e);
          this.selectedPPanels.forEach((pPanel) => pPanel.dragging = false);
          this.petaPanelMenu(pPanel, new Vec2(mouse));
        } else if (!this.detailsMode) {
          this.$components.contextMenu.open([{
            label: this.$t("boards.menu.openBrowser"),
            click: () => {
              API.send("openWindow", WindowType.BROWSER);
            }
          }, { separate: true }, {
            label: this.$t("boards.menu.resetPosition"),
            click: () => {
              this.resetTransform();
            }
          }], new Vec2(mouse));
        }
      }
      this.dragging = false;
    } else if (e.data.button === MouseButton.LEFT) {
      this.mouseLeftPressing = false;
      this.pPanelsArray.forEach((pPanel) => {
        pPanel.dragging = false;
      });
      this.draggingPanels = false;
      this.selecting = false;
    }
    this.orderPIXIRender();
  }
  pointermove(e: PIXI.InteractionEvent) {
    const mouse = this.getMouseFromEvent(e);
    this.mousePosition = new Vec2(mouse);
    this.click.move(this.mousePosition);
    if (this.mouseLeftPressing || this.mouseRightPressing || this.draggingPanels) {
      this.orderPIXIRender();
    }
  }
  getMouseFromEvent(e: PIXI.InteractionEvent) {
    return new Vec2(e.data.global);
  }
  wheel(event: WheelEvent) {
    if (!this.board) {
      return;
    }
    const mouse = vec2FromPointerEvent(event).sub(this.mouseOffset).sub(this.stageRect.clone().div(2));
    if (event.ctrlKey || this.$systemInfo.platform === "win32") {
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
  updateScale() {
    if (this.board) {
      const scale = this.board.transform.scale;
      this.pPanelsArray.forEach((pp) => {
        pp.setZoomScale(scale);
      });
    }
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
    this.backgroundSprite.hitArea = new Rectangle(0, 0, this.stageRect.x, this.stageRect.y);
    this.backgroundSprite.beginFill(Number(this.board.background.fillColor.replace("#", "0x")));
    this.backgroundSprite.drawRect(0, 0, this.stageRect.x, this.stageRect.y);
  }
  animate() {
    if (!this.board) {
      return;
    }
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
        ) && pPanel.petaPanel.visible && !pPanel.petaPanel.locked;
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
      pPanel.orderRender();
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
    this.selectedPPanels.forEach((pPanel) => {
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
    if (this.detailsMode) {
      return;
    }
    const isMultiple = this.selectedPPanels.length > 1;
    this.$components.contextMenu.open([
      {
        label: this.$t("boards.panelMenu.toFront"),
        click: () => {
          this.selectedPPanels.forEach((pPanel) => {
            pPanel.petaPanel.index += this.pPanelsArray.length;
          });
          this.sortIndex();
        }
      },
      {
        label: this.$t("boards.panelMenu.toBack"),
        click: () => {
          this.selectedPPanels.forEach((pPanel) => {
            pPanel.petaPanel.index -= this.pPanelsArray.length;
          });
          this.sortIndex();
        }
      },
      {
        separate: true
      },
      {
        label: this.$t("boards.panelMenu.details"),
        click: () => {
          if (pPanel.petaPanel._petaImage === undefined) {
            return;
          }
          API.send("setDetailsPetaImage", pPanel.petaPanel._petaImage);
          API.send("openWindow", WindowType.DETAILS);
        }
      },
      {
        separate: true
      },
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
    if (offsetIndex === 0) {
      this.clearSelectionAll();
    }
    const offset = new Vec2(20, 20).mult(offsetIndex);
    petaPanel.width *= 1 / this.board.transform.scale;
    petaPanel.height *= 1 / this.board.transform.scale;
    petaPanel.position.sub(this.mouseOffset);
    petaPanel.position = new Vec2(this.panelsCenterWrapper.toLocal(petaPanel.position.clone().add(offset)));
    this.draggingPanels = true;
    const maxIndex = this.getMaxIndex();
    petaPanel.index = maxIndex + 1;
  }
  beginCrop(petaPanel: PetaPanel) {
    this.croppingPetaPanel = petaPanel;
    this.cropping = true;
    if (this.keyboards) {
      this.keyboards.enabled = false;
    }
  }
  endCrop() {
    this.croppingPetaPanel = null;
    this.cropping = false;
    if (this.keyboards) {
      this.keyboards.enabled = true;
    }
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
    this.orderPIXIRender();
  }
  getMaxIndex() {
    if (!this.board) {
      return -1;
    }
    return Math.max(...this.board.petaPanels.map((petaPanel) => petaPanel.index));
  }
  async load(): Promise<void> {
    this.updateDetailsPetaPanel();
    const log = logChunk().log;
    this.endCrop();
    Cursor.setCursor("wait");
    this.loading = true;
    if (this.cancel) {
      log("vBoard", `canceling loading`);
      this.pPanelsArray.forEach((pPanel) => {
        pPanel.cancelLoading();
      });
      await this.cancel();
      log("vBoard", `canceled loading`);
      return this.load();
    }
    this.pPanelsArray.forEach((pPanel) => {
      this.removePPanel(pPanel);
    });
    this.pTransformer.pPanels = this.pPanels = {};
    if (!this.board) {
      return;
    }
    log("vBoard", "load", minimId(this.board.id));
    const load = async (petaPanel: PetaPanel, index: number) => {
      if (!this.board) {
        return;
      }
      const progress =  `${index + 1}/${this.board.petaPanels.length}`;
      try {
        await this.createPPanel(petaPanel);
        log("vBoard", `loaded(${minimId(petaPanel._petaImage?.id)}):`, progress);
        this.loadingLog = `loaded(${minimId(petaPanel._petaImage?.id)}):${progress}\n` + this.loadingLog;
      } catch (error) {
        log("vBoard", `loderr(${minimId(petaPanel._petaImage?.id)}):`, progress, error);
        this.loadingLog = `loaderr(${minimId(petaPanel._petaImage?.id)}):${progress}\n` + this.loadingLog;
      }
      this.loadingProgress = ((index + 1) / this.board.petaPanels.length) * 100;
      this.orderPIXIRender();
    }
    const result = promiseSerial(load, [...this.board.petaPanels]);
    this.cancel = result.cancel;
    try {
      await result.promise;
    } catch (error) {
      log("vBoard", "load error:", error);
    }
    this.loading = false;
    this.loadingProgress = 0;
    this.loadingLog = "";
    this.cancel = undefined;
    log("vBoard", "load complete");
    this.sortIndex();
    this.orderPIXIRender();
    Object.values(this.pPanels).forEach((pPanel) => {
      if (!pPanel.petaPanel.gif.stopped) {
        pPanel.playGIF();
      }
    });
    Cursor.setDefaultCursor();
    if (!this.detailsMode) {
      this.$states.loadedPetaBoardId = this.board.id;
    }
  }
  async createPPanel(petaPanel: PetaPanel) {
    if (this.pPanels[petaPanel.id]) {
      return petaPanel;
    }
    const pPanel = new PPanel(petaPanel);
    pPanel.setZoomScale(this.board?.transform.scale || 1);
    await pPanel.init();
    pPanel.showNSFW = this.$nsfw.showNSFW;
    pPanel.onUpdateGIF = () => {
      if (!this.loading) {
        this.orderPIXIRender();
      }
    }
    this.pPanels[petaPanel.id] = pPanel;
    this.panelsCenterWrapper.addChild(pPanel);
    pPanel.orderRender();
    this.orderPIXIRender();
    pPanel.load().then(() => {
      pPanel.orderRender();
      this.orderPIXIRender();
    }).catch(() => {
      pPanel.orderRender();
      this.orderPIXIRender();
      // throw error;
    });
    await new Promise((res, rej) => {
      setTimeout(res);
    });
    return pPanel;
  }
  clearCache() {
    PIXI.utils.destroyTextureCache();
    PIXI.utils.clearTextureCache();
  }
  pointerdownPPanel(pPanel: PPanel, e: PIXI.InteractionEvent) {
    const mouse = this.getMouseFromEvent(e);
    if (!this.board || this.detailsMode) {
      return;
    }
    if (!Keyboards.pressed("shift") && (this.selectedPPanels.length <= 1 || !pPanel.selected)) {
      // シフトなし。かつ、(１つ以下の選択か、自身が未選択の場合)
      // 最前にして選択リセット
      this.clearSelectionAll();
    }
    if (this.selectedPPanels.length <= 1) {
      // 選択が１つ以下の場合選択範囲リセット
      this.clearSelectionAll();
    }
    pPanel.selected = true;
    this.layer.scrollTo(pPanel);
    this.draggingPanels = true;
    this.selectedPPanels.forEach((pPanel) => {
      const pos = new Vec2(mouse);
      pPanel.draggingOffset = new Vec2(pPanel.position).sub(this.panelsCenterWrapper.toLocal(pos));
      pPanel.dragging = true;
    });
  }
  orderPIXIRender() {
    this.renderOrdered = true;
  }
  renderPIXI() {
    if (this.renderOrdered) {
      this.animate();
      this.pixi?.render();
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
  updateDetailsPetaPanel() {
    if (!this.detailsMode) {
      return;
    }
    const petaPanel = this.board?.petaPanels[0];
    const petaImage = petaPanel?._petaImage;
    if (petaPanel && petaImage) {
      let width = 0;
      let height = 0;
      const maxWidth = this.stageRect.x * 0.9;
      const maxHeight = this.stageRect.y * 0.9;
      if (petaImage.height / petaImage.width < maxHeight / maxWidth) {
        width = maxWidth;
        height = maxWidth * petaImage.height;
      } else {
        height = maxHeight;
        width = maxHeight / petaImage.height;
      }
      petaPanel.width = width;
      petaPanel.height = height;
    }
  }
  get pPanelsArray() {
    return Object.values(this.pPanels);
  }
  get selectedPPanels() {
    return this.pPanelsArray.filter((pPanel) => pPanel.selected && pPanel.petaPanel.visible && !pPanel.petaPanel.locked);
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
  @Watch("$nsfw.showNSFW")
  changeShowNSFW() {
    this.pPanelsArray.forEach((pp) => {
      pp.showNSFW = this.$nsfw.showNSFW;
    });
    this.orderPIXIRender();
  }
  @Watch("board.petaPanels", { deep: true })
  changeBoardPetaPanels() {
    this.$emit("change", this.board);
  }
  @Watch("board.transform", { deep: true })
  changeBoardTransform() {
    this.updateRect();
    this.updateScale();
    this.$emit("change", this.board);
  }
  @Watch("board.background", { deep: true })
  changeBoardBackground() {
    this.updateRect();
    this.$emit("change", this.board);
    this.orderPIXIRender();
  }
  @Watch("board")
  changeBoard() {
    this.load();
  }
}
</script>

<style lang="scss" scoped>
t-board-root {
  position: relative;
  width: 100%;
  height: 100%;
  display: block;
  >t-pixi-container {
    position: absolute;
    top: 0px;
    left: 0px;
    width: 100%;
    height: 100%;
    z-index: 1;
    display: block;
  }
  >t-crop {
    position: absolute;
    z-index: 3;
    top: 0px;
    left: 0px;
    width: 100%;
    height: 100%;
    display: block;
  }
}
</style>