import { reactive, App } from "vue";
import * as defines from "@/defines";
type Defines = typeof defines;
const Plugin = {
  async install(app: App) {
    app.config.globalProperties.$defines = defines;
  }
}
export default Plugin;
declare module '@vue/runtime-core' {
  export interface ComponentCustomProperties {
    $defines: Defines;
  }
}