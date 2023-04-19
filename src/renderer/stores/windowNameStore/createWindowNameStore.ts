import { InjectionKey, readonly, ref } from "vue";

import { WindowName } from "@/commons/windows";

export async function createWindowNameStore(windowName: WindowName) {
  return {
    windowName: readonly(ref(windowName)),
  };
}
export type WindowNameStore = Awaited<ReturnType<typeof createWindowNameStore>>;
export const windowNameStoreKey: InjectionKey<WindowNameStore> = Symbol("windowNameStore");
