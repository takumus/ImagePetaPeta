import { API } from "@/renderer/api";
import { defaultSettings, Settings } from "@/datas/settings";
import { reactive, App } from "vue";
let settings: Settings = defaultSettings;
const Plugin = {
  async install(app: App) {
    settings = reactive(await API.send("getSettings"));
    app.config.globalProperties.$settings = settings;
  }
}
export default Plugin;
declare module '@vue/runtime-core' {
  export interface ComponentCustomProperties {
    $settings: typeof settings;
  }
}