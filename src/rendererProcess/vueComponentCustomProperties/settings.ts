import { API } from "@/rendererProcess/api";
import { Settings } from "@/commons/datas/settings";
import { reactive, App, ref, watch as _watch } from "vue";
export default {
  async install(app: App) {
    // 初期設定取得
    app.config.globalProperties.$settings = reactive(await API.send("getSettings"));
    const watch = () => {
      return _watch(app.config.globalProperties.$settings as Settings, (value) => {
        API.send("updateSettings", value);
      }, {
        deep: true
      });
    }
    // watch開始。
    let unwatch = watch();
    API.on("updateSettings", (event, setting) => {
      // メインプロセス側からの変更はunwatch
      unwatch();
      // レンダラに適用
      Object.assign(app.config.globalProperties.$settings, setting);
      // watch again
      unwatch = watch();
    });
  }
}
declare module '@vue/runtime-core' {
  export interface ComponentCustomProperties {
    $settings: Settings;
  }
}