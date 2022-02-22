import { reactive, App } from "vue";
import { API } from "@/renderer/api";
export default {
  install(app: App) {
    app.config.globalProperties.$api = API;
  }
}
declare module '@vue/runtime-core' {
  export interface ComponentCustomProperties {
    $api: typeof API;
  }
}