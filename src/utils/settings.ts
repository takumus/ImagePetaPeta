import { Settings } from "@/datas/settings";
import { reactive } from "vue";
export const defaultSettings: Settings = {
  windowWidth: 0,
  windowHeight: 0,
  dbDirectory: "",
  backgroundFillColor: "#ffffff",
  backgroundLineColor: "#cccccc"
}
export const reactivedSettings: Settings = reactive(defaultSettings);
declare module '@vue/runtime-core' {
  export interface ComponentCustomProperties {
    $settings: typeof reactivedSettings;
  }
}