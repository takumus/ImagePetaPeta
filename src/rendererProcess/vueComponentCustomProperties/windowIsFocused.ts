import { WindowType } from "@/commons/datas/windowType";
import { API } from "@/rendererProcess/api";
import { reactive, App, ref } from "vue";
const windowIsFocused = reactive({
  focused: false,
  activeOtherMainWindows: false,
  activeWindows: {} as { [key in WindowType]?: boolean }
});
export function createPlugin(myWindowType: WindowType) {
  return {
    async install(app: App) {
      app.config.globalProperties.$focusedWindows = windowIsFocused;
      windowIsFocused.focused = await API.send("getWindowIsFocused");
      windowIsFocused.activeWindows = await API.send("getActiveWindows");
      function activeOtherMainWindows() {
        windowIsFocused.activeOtherMainWindows = myWindowType === WindowType.BOARD ? Boolean(windowIsFocused.activeWindows.browser) : myWindowType === WindowType.BROWSER ? Boolean(windowIsFocused.activeWindows.board) : true;
      }
      activeOtherMainWindows();
      API.on("windowFocused", (event, focused, windowType) => {
        if (location.search.includes("?" + windowType)) {
          windowIsFocused.focused = focused;
        }
      });
      API.on("activeWindows", (event, windows) => {
        Object.assign(windowIsFocused.activeWindows, windows);
        activeOtherMainWindows();
      });
    }
  }
}
declare module '@vue/runtime-core' {
  export interface ComponentCustomProperties {
    $focusedWindows: typeof windowIsFocused;
  }
}