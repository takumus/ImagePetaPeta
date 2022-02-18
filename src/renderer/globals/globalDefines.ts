import { reactive, App } from "vue";
import * as defines from "@/defines";
type Defines = Readonly<typeof defines>;
const Plugin = {
  install(app: App) {
    app.config.globalProperties.$defines = {};
    Object.keys(defines).forEach((key) => {
      Object.defineProperty(app.config.globalProperties.$defines, key, {
        value: (defines as any)[key],
        writable: false
      });
    })
  }
}
export default Plugin;
declare module '@vue/runtime-core' {
  export interface ComponentCustomProperties {
    $defines: Defines;
  }
}