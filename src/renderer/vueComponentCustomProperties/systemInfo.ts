import { API } from "@/renderer/api";
import { reactive, App } from "vue";
const systemInfo: {
  platform: NodeJS.Platform
} = reactive({
  platform: "win32"
});
export default {
  async install(app: App) {
    app.config.globalProperties.$systemInfo = systemInfo;
    systemInfo.platform = await API.send("getPlatform");
  }
}
declare module '@vue/runtime-core' {
  export interface ComponentCustomProperties {
    $systemInfo: typeof systemInfo
  }
}