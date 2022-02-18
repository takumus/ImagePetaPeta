import { ContextMenuItem } from "@/datas/contextMenuItem";
import { Vec2 } from "@/utils/vec2";
// let app: App;
interface GLOBALS {
  contextMenu: {
    open: (items: ContextMenuItem[], position: Vec2) => void;
  }
  complement: {
    open: (element: HTMLElement, items: string[]) => void;
  }
  browser: {
    open: () => void;
    close: () => void;
    visible: boolean;
  }
  info: {
    open: () => void
    close: () => void
  }
  settings: {
    open: () => void
    close: () => void
  },
  importImages: () => void,
  modalIds: string[],
  currentModalZIndex: number
}
declare module '@vue/runtime-core' {
  export interface ComponentCustomProperties {
    $globalComponents: GLOBALS;
  }
}