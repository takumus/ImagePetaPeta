import { API } from "@/rendererProcess/api";
import { reactive, App } from "vue";
import { States } from "@/commons/datas/states";
export default {
  async install(app: App) {
    app.config.globalProperties.$states = reactive(await API.send("getStates"));
  }
}
declare module '@vue/runtime-core' {
  export interface ComponentCustomProperties {
    $states: States;
  }
}