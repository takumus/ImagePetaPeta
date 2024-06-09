import { InjectionKey, readonly, ref } from "vue";

import { WindowName } from "@/commons/windows";

import { IPC } from "@/renderer/libs/ipc";

export async function createWindowStatusStore(myWindowName: WindowName) {
  const state = ref({
    focused: await IPC.windows.getIsFocused(),
    isMainWindow: (await IPC.windows.getMainWindowName()) === myWindowName,
  });
  IPC.common.on("windowFocused", (event, focused, windowName) => {
    if (myWindowName === windowName) {
      state.value.focused = focused;
    }
  });
  IPC.common.on("mainWindowName", (event, type) => {
    state.value.isMainWindow = type === myWindowName;
  });
  return {
    state: readonly(state),
  };
}
export type WindowStatusStore = Awaited<ReturnType<typeof createWindowStatusStore>>;
export const windowStatusStoreKey: InjectionKey<WindowStatusStore> = Symbol("windowStatusStore");
