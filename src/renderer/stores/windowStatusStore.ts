import { InjectionKey, readonly, ref } from "vue";
import { IPC } from "@/renderer/ipc";
import { inject } from "@/renderer/utils/vue";
import { WindowType } from "@/commons/datas/windowType";

export async function createWindowStatusStore(myWindowType: WindowType) {
  const state = ref({
    focused: await IPC.send("getWindowIsFocused"),
    isMainWindow: (await IPC.send("getMainWindowType")) === myWindowType,
  });
  IPC.on("windowFocused", (event, focused, windowType) => {
    if (myWindowType === windowType) {
      state.value.focused = focused;
    }
  });
  IPC.on("mainWindowType", (event, type) => {
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
