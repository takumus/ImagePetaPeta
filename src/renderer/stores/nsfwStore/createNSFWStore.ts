import { InjectionKey, readonly, ref } from "vue";

import { IPC } from "@/renderer/libs/ipc";

export async function createNSFWStore() {
  const state = ref(await IPC.common.getShowNSFW());
  IPC.on("showNSFW", (_, value) => {
    state.value = value;
  });
  function update(value: boolean) {
    IPC.common.setShowNSFW(value);
  }
  return {
    state: readonly(state),
    update,
  };
}
export type NSFWStore = Awaited<ReturnType<typeof createNSFWStore>>;
export const nsfwStoreKey: InjectionKey<NSFWStore> = Symbol("nsfwStore");
