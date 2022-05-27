import { API } from "@/rendererProcess/api";
import { reactive, App, ref } from "vue";
const windowIsFocused = ref(false);
export function createPlugin() {
  return {
    async install(app: App) {
      app.config.globalProperties.$windowIsFocused = windowIsFocused;
      windowIsFocused.value = await API.send("getWindowIsFocused");
      API.on("windowFocused", (event, focused, windowType) => {
        if (location.search.includes("?" + windowType)) {
          windowIsFocused.value = focused;
        }
      })
    }
  }
}
declare module '@vue/runtime-core' {
  export interface ComponentCustomProperties {
    $windowIsFocused: typeof windowIsFocused;
  }
}