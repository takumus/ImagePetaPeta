import { InjectionKey, readonly, ref } from "vue";
import { API } from "@/rendererProcess/api";
import { inject } from "@/rendererProcess/utils/vue";
import { WindowType } from "@/commons/datas/windowType";

export async function createWindowStatusStore(myWindowType: WindowType) {
  const state = ref({
    focused: await API.send("getWindowIsFocused"),
    isMainWindow: (await API.send("getMainWindowType")) === myWindowType,
  });
  API.on("windowFocused", (event, focused, windowType) => {
    if (myWindowType === windowType) {
      state.value.focused = focused;
    }
  });
  API.on("mainWindowType", (event, type) => {
    state.value.isMainWindow = type === myWindowType;
  });
  return {
    state: readonly(state),
  };
}
export function useWindowStatusStore() {
  return inject(windowStatusStoreKey);
}
export type WindowStatusStore = Awaited<ReturnType<typeof createWindowStatusStore>>;
export const windowStatusStoreKey: InjectionKey<WindowStatusStore> = Symbol("windowStatusStore");
