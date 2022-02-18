import { API } from "@/renderer/api";
import { defaultSettings, Settings } from "@/datas/settings";
import { reactive, App } from "vue";
const settings: Settings = reactive(defaultSettings);
const Plugin = {
  async install(app: App) {
    app.config.globalProperties.$settings = settings;
    Object.assign(settings, await API.send("getSettings"));
  }
}
export default Plugin;
declare module '@vue/runtime-core' {
  export interface ComponentCustomProperties {
    $settings: typeof settings;
  }
}