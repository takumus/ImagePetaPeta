import { InjectionKey, readonly, ref } from "vue";

export async function createSystemInfoStore(platform: NodeJS.Platform) {
  return {
    systemInfo: readonly(
      ref({
        platform,
      }),
    ),
  };
}
export type SystemInfoStore = Awaited<ReturnType<typeof createSystemInfoStore>>;
export const systemInfoStoreKey: InjectionKey<SystemInfoStore> = Symbol("systemInfoStore");
