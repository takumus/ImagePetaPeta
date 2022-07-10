import { Vue } from "vue-class-component";

export class SortHelper<T extends { data: any, id: number }> {
  layers!: HTMLElement;
  layersParent!: HTMLElement;
  cellDrag!: Vue;
  draggingPPanel: T | null = null;
  autoScrollVY = 0;
  mouseY = 0;
  fixedHeight = 0;
  layerCellDatas: T[] = [];
  constructor(
    private dataToComponent: (data: T) => Vue,
    private dataToIndex: (data: T) => number,
    private setIndex: (data: T, index: number) => void,
    private sortIndex: () => void,
    private changeDraggingData: (draggingData: T | null) => void
  ) {
    //
  }
  init(layers: HTMLElement, layersParent: HTMLElement, cellDrag: Vue) {
    this.layers = layers;
    this.layersParent = layersParent;
    this.cellDrag = cellDrag;
    window.addEventListener("mousemove", this.mousemove);
    window.addEventListener("mouseup", this.mouseup);
    setInterval(() => {
      if (this.draggingPPanel) {
        this.layersParent.scrollTop += this.autoScrollVY;
        this.updateDragCell(this.mouseY);
        this.sort();
      }
    }, 1000 / 60);
  }
  destroy() {
    window.removeEventListener("mousemove", this.mousemove);
    window.removeEventListener("mouseup", this.mouseup);
  }
  scrollTo = (pPanel: T) => {
    // const layerCell = this.vLayerCells[pPanel.petaPanel.id];
    const layerCell = this.dataToComponent(pPanel);
    if (!layerCell) {
      return;
    }
    this.layersParent.scrollTop = layerCell.$el.getBoundingClientRect().y - this.layersParent.getBoundingClientRect().y + this.layersParent.scrollTop;
  }
  startDrag = (pPanel: T, event: MouseEvent) => {
    this.mouseY = event.clientY - this.layersParent.getBoundingClientRect().y;
    this.fixedHeight = this.layers.getBoundingClientRect().height;
    this.fixedHeight = this.fixedHeight < this.layersParent.getBoundingClientRect().height ? this.layersParent.getBoundingClientRect().height : this.fixedHeight;
    this.layers.style.height = this.fixedHeight + "px";
    this.layers.style.overflow = "hidden";
    this.draggingPPanel = pPanel;
    this.changeDraggingData(this.draggingPPanel);
    this.updateDragCell(this.mouseY);
    // this.clearSelectionAll(true);
    // pPanel.selected = true;
    this.sort();
    // this.$emit("update");
  }
  mousemove = (event: MouseEvent) => {
    // console.log(this.draggingPPanel)
    if (!this.draggingPPanel) {
      return;
    }
    this.mouseY = event.clientY - this.layersParent.getBoundingClientRect().y;
    this.updateDragCell(this.mouseY);
    this.sort();
    this.autoScroll(this.mouseY);
  }
  sort = () => {
    let changed = false;
    this.layerCellDatas.map((cellData) => {
      const layerCell = cellData.data == this.draggingPPanel?.data ? this.cellDrag : this.dataToComponent(cellData);
      const layerCellData = cellData;
      return {
        layerCell,
        layerCellData,
        y: layerCell.$el.getBoundingClientRect().y
      }
    }).sort((a, b) => {
      return b.y - a.y;
    }).forEach((v, index) => {
      // if (!v.layerCell.pPanel) {
      //   return;
      // }
      if (this.dataToIndex(v.layerCellData) != index) {
        changed = true;
      }
      this.setIndex(v.layerCellData, index);
    });
    if (changed) {
      // this.$emit("sortIndex");
      this.sortIndex();
    }
  }
  autoScroll = (mouseY: number) => {
    const height = this.layersParent.getBoundingClientRect().height;
    const autoScrollY = 20;
    if (mouseY < autoScrollY) {
      this.autoScrollVY = -(autoScrollY - mouseY);
    } else if (mouseY > height - autoScrollY) {
      this.autoScrollVY = (mouseY - (height - autoScrollY));
    } else {
      this.autoScrollVY = 0;
    }
  }
  updateDragCell = (y: number, absolute = false) => {
    const offset = this.cellDrag.$el.getBoundingClientRect().height / 2;
    this.cellDrag.$el.style.top = `${absolute ? y : (y + this.layersParent.scrollTop - offset)}px`;
  }
  mouseup = (event: MouseEvent) => {
    this.draggingPPanel = null;
    this.changeDraggingData(this.draggingPPanel);
    this.autoScrollVY = 0;
    this.layers.style.height = "unset";
    this.layers.style.overflow = "unset";
    this.updateDragCell(0, true);
  }
}