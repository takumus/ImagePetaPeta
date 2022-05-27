import { States } from "@/commons/datas/states";
import { API } from "@/rendererProcess/api";
import { reactive, App, ref, watch as _watch } from "vue";
export default {
  async install(app: App) {
    // 初期設定取得
    app.config.globalProperties.$states = reactive(await API.send("getStates"));
    const watch = () => {
      return _watch(app.config.globalProperties.$states as States, (value) => {
        API.send("updateStates", value);
      }, {
        deep: true
      });
    }
    // watch開始。
    let unwatch = watch();
    API.on("updateStates", (event, states) => {
      // メインプロセス側からの変更はunwatch
      unwatch();
      // レンダラに適用
      Object.assign(app.config.globalProperties.$states, states);
      // watch again
      unwatch = watch();
    });
  }
}
declare module '@vue/runtime-core' {
  export interface ComponentCustomProperties {
    $states:States;
  }
}