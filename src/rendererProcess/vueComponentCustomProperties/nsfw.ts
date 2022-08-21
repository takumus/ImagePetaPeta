import { reactive, App } from "vue";
import { API } from "@/rendererProcess/api";
const nsfw = reactive({
  showNSFW: false,
});
export default {
  async install(app: App) {
    app.config.globalProperties.$nsfw = nsfw;
    nsfw.showNSFW = await API.send("getShowNSFW");
    API.on("showNSFW", (_event, value) => {
      nsfw.showNSFW = value;
    });
  },
};
declare module "@vue/runtime-core" {
  export interface ComponentCustomProperties {
    $nsfw: typeof nsfw;
  }
}
