import { defaultSettings, Settings } from "@/datas/settings";
import { reactive, App } from "vue";
const reactivedSettings: Settings = reactive(defaultSettings);
const Plugin = {
  install(app: App) {
    app.config.globalProperties.$settings = reactivedSettings;
  }
}
export default Plugin;
declare module '@vue/runtime-core' {
  export interface ComponentCustomProperties {
    $settings: typeof reactivedSettings;
  }
}