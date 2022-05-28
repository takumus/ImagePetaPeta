import { WindowType } from "@/commons/datas/windowType";
import { App } from "vue";
export function createPlugin() {
  const windowType = location.search.replace(/\?/g, "") as WindowType;
  return {
    async install(app: App) {
      app.config.globalProperties.$windowType = windowType;
    },
    windowType
  }
}
declare module '@vue/runtime-core' {
  export interface ComponentCustomProperties {
    $windowType: WindowType;
  }
}