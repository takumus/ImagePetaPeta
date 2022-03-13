import { API } from "@/rendererProcess/api";
import { Settings } from "@/commons/datas/settings";
import { reactive, App } from "vue";
export default {
  async install(app: App) {
    app.config.globalProperties.$settings = reactive(await API.send("getSettings"));
  }
}
declare module '@vue/runtime-core' {
  export interface ComponentCustomProperties {
    $settings: Settings;
  }
}