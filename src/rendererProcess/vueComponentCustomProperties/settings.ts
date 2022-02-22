import { API } from "@/rendererProcess/api";
import { defaultSettings, Settings } from "@/datas/settings";
import { reactive, App } from "vue";
let settings: Settings = defaultSettings;
export default {
  async install(app: App) {
    settings = reactive(await API.send("getSettings"));
    app.config.globalProperties.$settings = settings;
  }
}
declare module '@vue/runtime-core' {
  export interface ComponentCustomProperties {
    $settings: typeof settings;
  }
}