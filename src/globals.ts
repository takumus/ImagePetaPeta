import { ContextMenuItem } from "@/datas";
import { Vec2 } from "@/utils";
import { API } from "./api";
// let app: App;
const GLOBALS = {
  contextMenu: {
    open: (items: ContextMenuItem[], position: Vec2): void => {
      //
    }
  },
  complement: {
    open: (element: HTMLElement, items: string[]) => {
      //
    }
  },
  browser: {
    open: () => {
      //
    },
    close: () => {
      //
    }
  },
  info: {
    open: () => {
      //
    },
    close: () => {
      //
    }
  },
  settings: {
    open: () => {
      API.send("dialog", "hello", "hello".split(""));
    },
    close: () => {
      //
    }
  },
  importImages: () => {
    API.send("browseImages");
  }
}
declare module '@vue/runtime-core' {
  export interface ComponentCustomProperties {
    $globals: typeof GLOBALS;
  }
}
// app.config.globalProperties.abc="aaa"
export default GLOBALS;