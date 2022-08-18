import { reactive, App } from "vue";
import * as defines from "@/commons/defines";
export default {
  install(app: App) {
    app.config.globalProperties.$defines = {};
    Object.keys(defines).forEach((key) => {
      Object.defineProperty(app.config.globalProperties.$defines, key, {
        value: (defines as any)[key],
        writable: false,
      });
    });
  },
};
declare module "@vue/runtime-core" {
  export interface ComponentCustomProperties {
    $defines: Readonly<typeof defines>;
  }
}
