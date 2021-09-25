import { ContextMenuItem } from "@/datas";
import { Vec2 } from "@/utils";
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
  importImages: () => void
}
declare module '@vue/runtime-core' {
  export interface ComponentCustomProperties {
    $globals: GLOBALS;
  }
}