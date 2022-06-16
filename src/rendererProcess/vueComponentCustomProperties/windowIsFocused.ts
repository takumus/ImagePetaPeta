import { WindowType } from "@/commons/datas/windowType";
import { API } from "@/rendererProcess/api";
import { reactive, App, ref } from "vue";
const windowIsFocused = reactive({
  focused: false,
  isMainWindow: false
});
export function createPlugin(myWindowType: WindowType) {
  return {
    async install(app: App) {
      app.config.globalProperties.$focusedWindows = windowIsFocused;
      windowIsFocused.focused = await API.send("getWindowIsFocused");
      windowIsFocused.isMainWindow = await API.send("getMainWindowType") === myWindowType;
      API.on("windowFocused", (event, focused, windowType) => {
        if (myWindowType === windowType) {
          windowIsFocused.focused = focused;
        }
      });
      API.on("mainWindowType", (event, type) => {
        windowIsFocused.isMainWindow = type === myWindowType;
      });
    }
  }
}
declare module '@vue/runtime-core' {
  export interface ComponentCustomProperties {
    $focusedWindows: typeof windowIsFocused;
  }
}