import * as PIXI from "pixi.js";
import { Vec2 } from "@/commons/utils/vec2";
import { PPanel } from "@/rendererProcess/components/board/ppanels/PPanel";
import { PetaPanel } from "@/commons/datas/petaPanel";
import { MouseButton } from "@/commons/datas/mouseButton";
import { ClickChecker } from "@/rendererProcess/utils/clickChecker";
import { PSelection } from "@/rendererProcess/components/board/ppanels/PSelection";
import { PControlPoint } from "@/rendererProcess/components/board/ppanels/PControlPoint";
import deepcopy from "deepcopy";
import { ROTATION_BLOCK_INCREMENT } from "@/commons/defines";
enum ControlStatus {
  PANEL_DRAG = "p_drag",
  PANEL_ROTATE = "p_rotate",
  PANEL_SIZE = "p_size",
  BACKGROUND_DRAG = "bg_drag",
  NONE = "none"
}
export class PTransformer extends PIXI.Container {
  corners: PControlPoint[] = [];
  dragOffset = new Vec2();
  controlStatus = ControlStatus.NONE;
  beginRotatingRotation = 0;
  rotatingRotation = 0;
  beginTransformCorners: Vec2[] = [];
  transformingPPanels: PPanel[] = [];
  sizingCornerIndex = -1;
  pairCorner = new Vec2();
  beginSizingPosition = new Vec2();
  beginSizingPetaPanels: PetaPanel[] = [];
  beginSizingDistance = 0;
  pPanels: {[key: string]: PPanel} = {};
  click = new ClickChecker();
  pMultipleSelection: PSelection = new PSelection();
  _scale = 0;
  fit = false;
  constructor() {
    super();
    for (let i = 0; i < 8; i++) {
      const c = new PControlPoint();
      c.index = i;
      this.corners.push(c);
    }
    this.addChild(this.pMultipleSelection);
    this.corners.forEach((c, i) => {
      c.size.on("pointerdown", (e) => {
        this.beginSizing(i, e);
      });
      c.rotate.on("pointerdown", (e) => {
        this.beginRotating(i, e);
      });
    });
    this.addChild(...this.corners);
  }
  setScale(scale: number) {
    if (scale == this._scale) {
      return;
    }
    this._scale = scale;
    this.pMultipleSelection.setScale(scale);
    this.corners.forEach((c) => {
      c.setScale(scale);
    });
  }
  beginSizing(index: number, e: PIXI.InteractionEvent) {
    this.controlStatus = ControlStatus.PANEL_SIZE;
    this.sizingCornerIndex = index;
    this.beginSizingPosition = new Vec2(e.data.global);
    this.beginSizingPetaPanels = this.selectedPPanels.map((pPanel) => {
      const p = deepcopy(pPanel.petaPanel);
      delete p._petaImage;
      return p;
    });
    this.pairCorner = new Vec2(this.corners[(this.sizingCornerIndex + this.corners.length / 2) % this.corners.length]);
    this.beginSizingDistance = this.pairCorner.getDistance(this.corners[this.sizingCornerIndex]!);
  }
  beginRotating(index: number, e: PIXI.InteractionEvent) {
    this.beginSizingPetaPanels = this.selectedPPanels.map((pPanel) => {
      const p = deepcopy(pPanel.petaPanel);
      delete p._petaImage;
      return p;
    });
    this.beginTransformCorners = [];
    this.corners.forEach((c) => {
      this.beginTransformCorners.push(new Vec2(c));
    });
    this.rotatingRotation = this.getRotatingCenter().getDiff(this.toLocal(e.data.global)).atan2();
    this.beginRotatingRotation = this.rotatingRotation;
    this.controlStatus = ControlStatus.PANEL_ROTATE;
  }
  getPPanelFromObject(object: PIXI.DisplayObject) {
    if (this.pPanelsArray.find((c) => c == object)) {
      return object as PPanel;
    }
    return null;
  }
  getRotatingCenter() {
    const center = new Vec2(0, 0);
    this.beginTransformCorners.forEach((c) => {
      center.add(new Vec2(c));
    });
    return center.div(this.beginTransformCorners.length);
  }
  getCornersCenter() {
    const center = new Vec2(0, 0);
    this.corners.forEach((c) => {
      center.add(new Vec2(c));
    });
    return center.div(this.corners.length);
  }
  get selectedPPanels() {
    return this.pPanelsArray.filter((pPanel) => pPanel.selected);
  }
  get pPanelsArray() {
    return Object.values(this.pPanels);
  }
  mouseup(e: PIXI.InteractionEvent) {
    // this.loadOriginal();
    this.controlStatus = ControlStatus.NONE;
    if (e.data.button == MouseButton.LEFT) {
      this.pPanelsArray.forEach((pPanel) => {
        pPanel.dragging = false;
      });
    }
  }
  mousemove(e: PIXI.InteractionEvent) {
    this.click.move(e.data.global);
    if (this.controlStatus == ControlStatus.PANEL_SIZE) {
      const scale = this.pairCorner.getDistance(this.toLocal(e.data.global)) / this.beginSizingDistance;
      this.selectedPPanels.forEach((pPanel, i) => {
        pPanel.petaPanel.width = this.beginSizingPetaPanels[i]!.width * scale;
        pPanel.petaPanel.height = this.beginSizingPetaPanels[i]!.height * scale;
        const position = this.pairCorner.getDiff(
          this.toLocal(
            pPanel.parent.toGlobal(
              this.beginSizingPetaPanels[i]!.position
            )
          )
        );
        pPanel.petaPanel.position = new Vec2(
          pPanel.parent.toLocal(
            this.toGlobal(
              position
              .clone()
              .normalize()
              .mult(position.getLength())
              .mult(scale)
              .add(this.pairCorner)
            )
          )
        );
      })
    } else if (this.controlStatus == ControlStatus.PANEL_ROTATE) {
      const center = this.getRotatingCenter();
      this.rotatingRotation = center.getDiff(this.toLocal(e.data.global)).atan2();
      if (this.fit) {
        const diff = center.getDiff(this.beginTransformCorners[3]!);
        const r = diff.atan2() + this.rotatingRotation - this.beginRotatingRotation;
        const rot = Math.floor(r / Math.PI * 180 + ROTATION_BLOCK_INCREMENT / 2) % 360;
        this.rotatingRotation = Math.floor((rot + (rot < 0 ? 360 : 0)) / ROTATION_BLOCK_INCREMENT) * (ROTATION_BLOCK_INCREMENT / 180 * Math.PI) - diff.atan2() + this.beginRotatingRotation;
      }
      this.selectedPPanels.forEach((pPanel, i) => {
        pPanel.petaPanel.rotation = this.beginSizingPetaPanels[i]!.rotation + this.rotatingRotation - this.beginRotatingRotation;
        const diff = center.getDiff(
          this.toLocal(
            pPanel.parent.toGlobal(
              this.beginSizingPetaPanels[i]!.position
            )
          )
        );
        const rad = diff.atan2() + this.rotatingRotation - this.beginRotatingRotation;
        pPanel.petaPanel.position.set(
          pPanel.parent.toLocal(
            this.toGlobal(
              new Vec2(
                Math.cos(rad),
                Math.sin(rad)
              )
              .mult(diff.getLength())
              .add(center)
            )
          )
        );
      });
    }
    this.pPanelsArray.filter((pPanel) => pPanel.dragging).forEach((pPanel) => {
      pPanel.petaPanel.position = new Vec2(pPanel.parent.toLocal(e.data.global)).add(pPanel.draggingOffset);
    });
  }
  update() {
    if (this.controlStatus == ControlStatus.PANEL_ROTATE) {
      const center = this.getRotatingCenter();
      this.corners.forEach((c, i) => {
        const diff = center.getDiff(this.beginTransformCorners[i]!);
        const r = diff.atan2() + this.rotatingRotation - this.beginRotatingRotation;
        const d = diff.getLength();
        c.x = Math.cos(r) * d + center.x;
        c.y = Math.sin(r) * d + center.y;
        c.currentRotation = r;
      });
    } else {
      if (this.selectedPPanels.length == 1) {
        this.selectedPPanels[0]!.getCorners().forEach((c, i) => {
          const p = this.toLocal(this.selectedPPanels[0]!.toGlobal(c));
          this.corners[i * 2]!.x = p.x;
          this.corners[i * 2]!.y = p.y;
        });
      } else {
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        this.selectedPPanels.forEach((pPanel) => {
          pPanel.getCorners().forEach((c, i) => {
            const p = this.toLocal(pPanel.toGlobal(c));
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
          });
        });
        this.corners[0]!.x = minX;
        this.corners[0]!.y = minY;
        this.corners[2]!.x = maxX;
        this.corners[2]!.y = minY;
        this.corners[4]!.x = maxX;
        this.corners[4]!.y = maxY;
        this.corners[6]!.x = minX;
        this.corners[6]!.y = maxY;
      }
      for (let i = 0; i < this.corners.length / 2; i++) {
        const c = this.corners[i * 2 + 1]!;
        const pc = this.corners[i * 2];
        const nc = this.corners[(i * 2 + 2) % this.corners.length]!;
        new Vec2(pc)
        .add(nc)
        .div(2)
        .setTo(c);
      }
      const center = this.getCornersCenter();
      this.corners.forEach((c) => {
        const r = center.getDiff(c.position).atan2();
        c.currentRotation = r;
        c.currentParentRotation = center.getDiff(this.corners[3]!).atan2();
      })
    }
    if (this.selectedPPanels.length > 0) {
      this.pMultipleSelection.setCorners(this.corners.map((c) => new Vec2(c)));
      this.pMultipleSelection.visible = true;
    } else {
      this.pMultipleSelection.visible = false;
    }
    this.pMultipleSelection.update();
    this.corners.forEach((c) => {
      c.setScale(this._scale);
    });
  }
}