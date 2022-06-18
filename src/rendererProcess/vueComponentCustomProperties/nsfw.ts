import { reactive, App, ref, watch as _watch, ComponentCustomProperties } from "vue";
import { API } from "../api";
const nsfw = reactive({
  showNSFW: false
})
export default {
  async install(app: App) {
    app.config.globalProperties.$nsfw = nsfw;
    nsfw.showNSFW = await API.send("getShowNSFW");
    API.on("showNSFW", (event, value) => {
      nsfw.showNSFW = value;
    });
  }
}
declare module '@vue/runtime-core' {
  export interface ComponentCustomProperties {
    $nsfw: typeof nsfw;
  }
}