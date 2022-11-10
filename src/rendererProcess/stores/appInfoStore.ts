import { InjectionKey, readonly, ref } from "vue";
import { inject } from "@/rendererProcess/utils/vue";
import { IPC } from "@/rendererProcess/ipc";

export async function createAppInfoStore() {
  return {
    state: readonly(ref(await IPC.send("getAppInfo"))),
  };
}
export function useAppInfoStore() {
  return inject(appInfoStoreKey);
}
export type AppInfoStore = Awaited<ReturnType<typeof createAppInfoStore>>;
export const appInfoStoreKey: InjectionKey<AppInfoStore> = Symbol("appInfoStore");
