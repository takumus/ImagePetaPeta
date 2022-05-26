import { API } from "@/rendererProcess/api";
import { Settings } from "@/commons/datas/settings";
import { reactive, App, ref, watch } from "vue";
export default {
  async install(app: App) {
    app.config.globalProperties.$settings = reactive(await API.send("getSettings"));
    const beginWatch = () => {
      return watch(app.config.globalProperties.$settings as Settings, (newValue, oldValue) => {
        API.send("updateSettings", newValue);
      }, {
        deep: true
      });
    }
    let unwatch = beginWatch();
    API.on("updateSettings", (event, setting) => {
      unwatch();
      Object.assign(app.config.globalProperties.$settings, setting);
      unwatch = beginWatch();
    });
  }
}
declare module '@vue/runtime-core' {
  export interface ComponentCustomProperties {
    $settings: Settings;
  }
}