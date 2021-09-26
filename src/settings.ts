import { Settings } from "@/datas/settings";
import { reactive } from "vue";
export const settings: Settings = reactive({
  windowWidth: 0,
  windowHeight: 0,
  dbDirectory: "",
  backgroundColor: ""
});
declare module '@vue/runtime-core' {
  export interface ComponentCustomProperties {
    $settings: typeof settings;
  }
}