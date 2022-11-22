import { InjectionKey, readonly, ref } from "vue";

import { IPC } from "@/renderer/ipc";

export async function createDarkModeStore() {
  const state = ref(await IPC.send("getIsDarkMode"));
  IPC.on("darkMode", (_, value) => {
    state.value = value;
  });
  return {
    state: readonly(state),
  };
}
export type DarkModeStore = Awaited<ReturnType<typeof createDarkModeStore>>;
export const darkModeStoreKey: InjectionKey<DarkModeStore> = Symbol("darkModeStore");
