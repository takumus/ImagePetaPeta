import { defaultSettings, Settings } from "@/datas/settings";
import { reactive, App } from "vue";
const reactivedSettings: Settings = reactive(defaultSettings);
export function initSettings(app: App) {
  app.config.globalProperties.$settings = reactivedSettings;
}
declare module '@vue/runtime-core' {
  export interface ComponentCustomProperties {
    $settings: typeof reactivedSettings;
  }
}