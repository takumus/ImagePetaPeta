import { InjectionKey, readonly, ref } from "vue";
import { inject } from "@/renderer/utils/vue";

export async function createSystemInfoStore(platform: NodeJS.Platform) {
  return {
    systemInfo: readonly(
      ref({
        platform,
      }),
    ),
  };
}
export function useSystemInfoStore() {
  return inject(systemInfoStoreKey);
}
export type SystemInfoStore = Awaited<ReturnType<typeof createSystemInfoStore>>;
export const systemInfoStoreKey: InjectionKey<SystemInfoStore> = Symbol("systemInfoStore");
