/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
export class SortHelper<T extends { data: any; id: number }, C extends { $el: HTMLElement }> {
  layers!: HTMLElement;
  layersParent!: HTMLElement;
  cellDrag!: C;
  draggingDataId: number | string | null = null;
  autoScrollVY = 0;
  mouseY = 0;
  fixedHeight = 0;
  layerCellDatas: T[] = [];
  constructor(
    private dataToComponent: (data: T) => C | undefined,
    private dataToIndex: (data: T) => number,
    private sortIndex: (change: { data: T; index: number }[]) => void,
    private changeDraggingData: (draggingData: string | number | null) => void,
    private dataToId: (data: T) => string | number,
  ) {
    //
  }
  init(layers: HTMLElement, layersParent: HTMLElement, cellDrag: C) {
    this.layers = layers;
    this.layersParent = layersParent;
    this.cellDrag = cellDrag;
    window.addEventListener("pointermove", this.pointermove);
    window.addEventListener("pointerup", this.pointerup);
    setInterval(() => {
      if (this.draggingDataId !== null) {
        this.layersParent.scrollTop += this.autoScrollVY;
        this.updateDragCell(this.mouseY);
        this.sort();
      }
    }, 1000 / 60);
  }
  destroy() {
    window.removeEventListener("pointermove", this.pointermove);
    window.removeEventListener("pointerup", this.pointerup);
  }
  scrollTo = (data: T) => {
    const layerCell = this.dataToComponent(data);
    if (!layerCell) {
      return;
    }
    this.layersParent.scrollTop =
      layerCell.$el.getBoundingClientRect().y -
      this.layersParent.getBoundingClientRect().y +
      this.layersParent.scrollTop;
  };
  startDrag = (data: T, event: PointerEvent) => {
    this.mouseY = event.clientY - this.layersParent.getBoundingClientRect().y;
    this.fixedHeight = this.layers.getBoundingClientRect().height;
    this.fixedHeight =
      this.fixedHeight < this.layersParent.getBoundingClientRect().height
        ? this.layersParent.getBoundingClientRect().height
        : this.fixedHeight;
    this.layers.style.height = this.fixedHeight + "px";
    this.layers.style.overflow = "hidden";
    this.draggingDataId = this.dataToId(data);
    this.changeDraggingData(this.draggingDataId);
    this.updateDragCell(this.mouseY);
    // this.clearSelectionAll(true);
    // pPanel.selected = true;
    this.sort();
    // this.$emit("update");
  };
  pointermove = (event: PointerEvent) => {
    if (this.draggingDataId === null) {
      return;
    }
    this.mouseY = event.clientY - this.layersParent.getBoundingClientRect().y;
    this.updateDragCell(this.mouseY);
    this.sort();
    this.autoScroll(this.mouseY);
  };
  sort = () => {
    const change: { data: T; index: number }[] = [];
    this.layerCellDatas
      .map((cellData) => {
        const layerCell =
          this.dataToId(cellData) === this.draggingDataId
            ? this.cellDrag
            : this.dataToComponent(cellData);
        const layerCellData = cellData;
        return {
          layerCell,
          layerCellData,
          y: layerCell ? layerCell.$el.getBoundingClientRect().y : 0,
        };
      })
      .sort((a, b) => {
        return b.y - a.y;
      })
      .forEach((v, index) => {
        if (this.dataToIndex(v.layerCellData) != index) {
          change.push({
            data: v.layerCellData,
            index,
          });
        }
      });
    if (change.length > 0) {
      this.sortIndex(change);
    }
  };
  autoScroll = (mouseY: number) => {
    const height = this.layersParent.getBoundingClientRect().height;
    const autoScrollY = 20;
    if (mouseY < autoScrollY) {
      this.autoScrollVY = -(autoScrollY - mouseY);
    } else if (mouseY > height - autoScrollY) {
      this.autoScrollVY = mouseY - (height - autoScrollY);
    } else {
      this.autoScrollVY = 0;
    }
  };
  updateDragCell = (y: number, absolute = false) => {
    const offset = this.cellDrag.$el.getBoundingClientRect().height / 2;
    this.cellDrag.$el.style.top = `${absolute ? y : y + this.layersParent.scrollTop - offset}px`;
  };
  pointerup = () => {
    this.draggingDataId = null;
    this.changeDraggingData(this.draggingDataId);
    this.autoScrollVY = 0;
    this.layers.style.height = "unset";
    this.layers.style.overflow = "unset";
    this.updateDragCell(0, true);
  };
}
