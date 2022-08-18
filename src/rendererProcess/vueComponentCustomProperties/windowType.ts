import { WindowType } from "@/commons/datas/windowType";
import { App } from "vue";
export function createPlugin(type: WindowType) {
  return {
    async install(app: App) {
      app.config.globalProperties.$windowType = type;
    },
  };
}
declare module "@vue/runtime-core" {
  export interface ComponentCustomProperties {
    $windowType: WindowType;
  }
}
