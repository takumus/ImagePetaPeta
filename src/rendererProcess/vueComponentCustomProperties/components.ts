import { ContextMenuItem } from "@/rendererProcess/components/utils/contextMenuItem";
import { Vec2 } from "@/commons/utils/vec2";
import { reactive, App } from "vue";
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
  dialog: {
    show: (label: string, items: string[]) => Promise<number>
  }
  modal: {
    modalIds: string[],
    currentModalZIndex: number
  }
}
export default {
  install(app: App) {
    app.config.globalProperties.$components = reactive({
      modal: {
        modalIds: [],
        currentModalZIndex: 0
      }
    } as Partial<GLOBALS>);
  }
}
declare module '@vue/runtime-core' {
  export interface ComponentCustomProperties {
    $components: GLOBALS;
  }
}