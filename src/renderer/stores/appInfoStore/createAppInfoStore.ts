import { InjectionKey, readonly, ref } from "vue";
import { IPC } from "@/renderer/ipc";

export async function createAppInfoStore() {
  return {
    state: readonly(ref(await IPC.send("getAppInfo"))),
  };
}
export type AppInfoStore = Awaited<ReturnType<typeof createAppInfoStore>>;
export const appInfoStoreKey: InjectionKey<AppInfoStore> = Symbol("appInfoStore");
