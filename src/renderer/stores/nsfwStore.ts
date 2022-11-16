import { InjectionKey, readonly, ref } from "vue";
import { IPC } from "@/renderer/ipc";
import { inject } from "@/renderer/utils/vue";

export async function createNSFWStore() {
  const state = ref(await IPC.send("getShowNSFW"));
  IPC.on("showNSFW", (_, value) => {
    state.value = value;
  });
  function update(value: boolean) {
    IPC.send("setShowNSFW", value);
  }
  return {
    state: readonly(state),
    update,
  };
}
export function useNSFWStore() {
  return inject(nsfwStoreKey);
}
export type NSFWStore = Awaited<ReturnType<typeof createNSFWStore>>;
export const nsfwStoreKey: InjectionKey<NSFWStore> = Symbol("nsfwStore");
