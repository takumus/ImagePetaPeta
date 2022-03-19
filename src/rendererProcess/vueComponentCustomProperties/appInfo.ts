import { AppInfo } from "@/commons/datas/appInfo";
import { API } from "@/rendererProcess/api";
import { reactive, App } from "vue";
export default {
  async install(app: App) {
    app.config.globalProperties.$appInfo = reactive(await API.send("getAppInfo"));
  }
}
declare module '@vue/runtime-core' {
  export interface ComponentCustomProperties {
    $appInfo: Readonly<AppInfo>;
  }
}