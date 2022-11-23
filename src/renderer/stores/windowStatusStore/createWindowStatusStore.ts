import { InjectionKey, readonly, ref } from "vue";

import { WindowType } from "@/commons/datas/windowType";

import { IPC } from "@/renderer/libs/ipc";

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
export type WindowStatusStore = Awaited<ReturnType<typeof createWindowStatusStore>>;
export const windowStatusStoreKey: InjectionKey<WindowStatusStore> = Symbol("windowStatusStore");
