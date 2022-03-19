import { API } from "@/rendererProcess/api";
import { reactive, App } from "vue";
const systemInfo: {
  platform: NodeJS.Platform
} = reactive({
  platform: "win32"
});
export function createPlugin(platform: NodeJS.Platform) {
  return {
    async install(app: App) {
      app.config.globalProperties.$systemInfo = systemInfo;
      systemInfo.platform = platform;
    }
  }
}
declare module '@vue/runtime-core' {
  export interface ComponentCustomProperties {
    $systemInfo: typeof systemInfo
  }
}