import * as PIXI from "pixi.js";
import { Vec2 } from "@/commons/utils/vec2";
import { PPanel } from "@/renderer/components/board/ppanels/PPanel";
import { PetaPanel } from "@/commons/datas/petaPanel";
import { ClickChecker } from "@/renderer/utils/clickChecker";
import { PTransformerDashedLine } from "@/renderer/components/board/ppanels/pTransformer/PTransformerDashedLine";
import { PTransformerControlPoint } from "@/renderer/components/board/ppanels/pTransformer/PTransformerControlPoint";
import deepcopy from "deepcopy";
import { ROTATION_BLOCK_INCREMENT } from "@/commons/defines";
enum ControlStatus {
  PANEL_DRAG = "p_drag",
  PANEL_ROTATE = "p_rotate",
  PANEL_SIZE = "p_size",
  BACKGROUND_DRAG = "bg_drag",
  NONE = "none",
}
export class PTransformer extends PIXI.Container {
  corners: [
    PTransformerControlPoint,
    PTransformerControlPoint,
    PTransformerControlPoint,
    PTransformerControlPoint,
    PTransformerControlPoint,
    PTransformerControlPoint,
    PTransformerControlPoint,
    PTransformerControlPoint,
  ];
  dragOffset = new Vec2();
  controlStatus = ControlStatus.NONE;
  beginRotatingRotation = 0;
  rotatingRotation = 0;
  beginTransformCorners: [Vec2, Vec2, Vec2, Vec2, Vec2, Vec2, Vec2, Vec2];
  transformingPPanels: PPanel[] = [];
  sizingCornerIndex = -1;
  pairCorner = new Vec2();
  beginSizingPosition = new Vec2();
  beginSizingPetaPanels: PetaPanel[] = [];
  beginSizingDistance = 0;
  click = new ClickChecker();
  pMultipleSelection: PTransformerDashedLine = new PTransformerDashedLine();
  draggingPanels = false;
  private mousePosition = new Vec2();
  _scale = 0;
  fit = false;
  updatePetaPanels?: () => void;
  constructor(public pPanels: { [key: string]: PPanel }) {
    super();
    this.corners = Array.from(
      { length: 8 },
      (_, id) => new PTransformerControlPoint(id),
    ) as typeof this.corners;
    this.beginTransformCorners = Array.from(
      { length: 8 },
      () => new Vec2(),
    ) as typeof this.beginTransformCorners;
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
    if (scale === this._scale) {
      return;
    }
    this._scale = scale;
    this.pMultipleSelection.setScale(scale);
    this.corners.forEach((c) => {
      c.setScale(scale);
    });
  }
  beginSizing(index: number, e: PIXI.FederatedPointerEvent) {
    this.mousePosition.set(e.data.global);
    this.click.down();
    this.controlStatus = ControlStatus.PANEL_SIZE;
    this.sizingCornerIndex = index;
    this.beginSizingPosition = new Vec2(e.data.global);
    this.beginSizingPetaPanels = this.selectedPPanels.map((pPanel) => {
      const p = deepcopy(pPanel.petaPanel);
      return p;
    });
    this.pairCorner = new Vec2(
      this.corners[(this.sizingCornerIndex + this.corners.length / 2) % this.corners.length],
    );
    const sizingCorner = this.corners[this.sizingCornerIndex];
    if (sizingCorner) {
      this.beginSizingDistance = this.pairCorner.getDistance(sizingCorner);
    }
  }
  beginRotating(index: number, e: PIXI.FederatedPointerEvent) {
    this.mousePosition.set(e.data.global);
    this.click.down();
    this.beginSizingPetaPanels = this.selectedPPanels.map((pPanel) => {
      const p = deepcopy(pPanel.petaPanel);
      return p;
    });
    this.beginTransformCorners = this.corners.map(
      (corner) => new Vec2(corner),
    ) as typeof this.beginTransformCorners;
    this.rotatingRotation = this.getRotatingCenter().getDiff(this.toLocal(e.data.global)).atan2();
    this.beginRotatingRotation = this.rotatingRotation;
    this.controlStatus = ControlStatus.PANEL_ROTATE;
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
    return this.pPanelsArray.filter(
      (pPanel) =>
        pPanel.petaPanel._selected && pPanel.petaPanel.visible && !pPanel.petaPanel.locked,
    );
  }
  get pPanelsArray() {
    return Object.values(this.pPanels);
  }
  pointerdownPPanel(pPanel: PPanel, e: PIXI.FederatedPointerEvent) {
    this.mousePosition.set(e.data.global);
    this.click.down();
    this.controlStatus = ControlStatus.PANEL_DRAG;
    const mouse = new Vec2(e.data.global);
    this.selectedPPanels.forEach((pPanel) => {
      const pos = new Vec2(mouse);
      pPanel.draggingOffset = new Vec2(pPanel.position).sub(pPanel.parent.toLocal(pos));
      pPanel.dragging = true;
    });
  }
  pointerup(e: PIXI.FederatedPointerEvent) {
    if (this.controlStatus === ControlStatus.PANEL_DRAG) {
      this.selectedPPanels.forEach((pPanel) => {
        pPanel.dragging = false;
      });
    }
    if (this.controlStatus !== ControlStatus.NONE) {
      if (!this.click.isClick) {
        this.updatePetaPanels?.();
      }
    }
    this.controlStatus = ControlStatus.NONE;
  }
  pointermove(e: PIXI.FederatedPointerEvent) {
    if (this.controlStatus !== ControlStatus.NONE) {
      if (this.click.isClick) {
        return;
      }
      this.mousePosition.set(e.data.global);
    }
    if (this.controlStatus === ControlStatus.PANEL_SIZE) {
      const scale =
        this.pairCorner.getDistance(this.toLocal(e.data.global)) / this.beginSizingDistance;
      this.selectedPPanels.forEach((pPanel, i) => {
        const beginSizingPetaPanel = this.beginSizingPetaPanels[i];
        if (beginSizingPetaPanel === undefined) {
          return;
        }
        pPanel.petaPanel.width = beginSizingPetaPanel.width * scale;
        pPanel.petaPanel.height = beginSizingPetaPanel.height * scale;
        const position = this.pairCorner.getDiff(
          this.toLocal(pPanel.parent.toGlobal(beginSizingPetaPanel.position)),
        );
        pPanel.petaPanel.position = new Vec2(
          pPanel.parent.toLocal(
            this.toGlobal(
              position
                .clone()
                .normalize()
                .mult(position.getLength())
                .mult(scale)
                .add(this.pairCorner),
            ),
          ),
        );
      });
    } else if (this.controlStatus === ControlStatus.PANEL_ROTATE) {
      const center = this.getRotatingCenter();
      this.rotatingRotation = center.getDiff(this.toLocal(e.data.global)).atan2();
      if (this.fit) {
        const corner = this.beginTransformCorners[3];
        if (corner === undefined) {
          return;
        }
        const diff = center.getDiff(corner);
        const r = diff.atan2() + this.rotatingRotation - this.beginRotatingRotation;
        const rot = Math.floor((r / Math.PI) * 180 + ROTATION_BLOCK_INCREMENT / 2) % 360;
        this.rotatingRotation =
          Math.floor((rot + (rot < 0 ? 360 : 0)) / ROTATION_BLOCK_INCREMENT) *
            ((ROTATION_BLOCK_INCREMENT / 180) * Math.PI) -
          diff.atan2() +
          this.beginRotatingRotation;
      }
      this.selectedPPanels.forEach((pPanel, i) => {
        const beginSizingPetaPanel = this.beginSizingPetaPanels[i];
        if (beginSizingPetaPanel === undefined) {
          return;
        }
        pPanel.petaPanel.rotation =
          beginSizingPetaPanel.rotation + this.rotatingRotation - this.beginRotatingRotation;
        const diff = center.getDiff(
          this.toLocal(pPanel.parent.toGlobal(beginSizingPetaPanel.position)),
        );
        const rad = diff.atan2() + this.rotatingRotation - this.beginRotatingRotation;
        pPanel.petaPanel.position.set(
          pPanel.parent.toLocal(
            this.toGlobal(
              new Vec2(Math.cos(rad), Math.sin(rad)).mult(diff.getLength()).add(center),
            ),
          ),
        );
      });
    } else if (this.controlStatus === ControlStatus.PANEL_DRAG) {
      this.pPanelsArray
        .filter((pPanel) => pPanel.dragging)
        .forEach((pPanel) => {
          pPanel.petaPanel.position = new Vec2(pPanel.parent.toLocal(this.mousePosition)).add(
            pPanel.draggingOffset,
          );
        });
    }
  }
  update() {
    if (this.controlStatus === ControlStatus.PANEL_ROTATE) {
      const center = this.getRotatingCenter();
      this.corners.forEach((c, i) => {
        const beginTransformCorner = this.beginTransformCorners[i];
        if (beginTransformCorner === undefined) {
          return;
        }
        const diff = center.getDiff(beginTransformCorner);
        const r = diff.atan2() + this.rotatingRotation - this.beginRotatingRotation;
        const d = diff.getLength();
        c.x = Math.cos(r) * d + center.x;
        c.y = Math.sin(r) * d + center.y;
        c.currentRotation = r;
      });
    }
    if (this.controlStatus != ControlStatus.PANEL_ROTATE) {
      const singlePPanel = this.selectedPPanels[0];
      if (this.selectedPPanels.length === 1 && singlePPanel !== undefined) {
        singlePPanel.getCorners().forEach((c, i) => {
          const p = this.toLocal(singlePPanel.toGlobal(c));
          const corner = this.corners[i * 2];
          if (corner) {
            corner.x = p.x;
            corner.y = p.y;
          }
        });
      } else {
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        this.selectedPPanels.forEach((pPanel) => {
          pPanel.getCorners().forEach((c) => {
            const p = this.toLocal(pPanel.toGlobal(c));
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
          });
        });
        this.corners[0].x = minX;
        this.corners[0].y = minY;
        this.corners[2].x = maxX;
        this.corners[2].y = minY;
        this.corners[4].x = maxX;
        this.corners[4].y = maxY;
        this.corners[6].x = minX;
        this.corners[6].y = maxY;
      }
      for (let i = 0; i < this.corners.length / 2; i++) {
        const c = this.corners[i * 2 + 1];
        const pc = this.corners[i * 2];
        const nc = this.corners[(i * 2 + 2) % this.corners.length];
        if (c === undefined || pc === undefined || nc === undefined) {
          continue;
        }
        new Vec2(pc).add(nc).div(2).setTo(c);
      }
      const center = this.getCornersCenter();
      this.corners.forEach((c) => {
        const r = center.getDiff(c.position).atan2();
        c.currentRotation = r;
        c.currentParentRotation = center.getDiff(this.corners[3]).atan2();
      });
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
