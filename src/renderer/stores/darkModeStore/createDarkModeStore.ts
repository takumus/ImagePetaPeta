import { InjectionKey, readonly, ref } from "vue";

import { IPC } from "@/renderer/libs/ipc";
import { applyStyle, defaultStyles } from "@/renderer/styles/styles";

export async function createDarkModeStore() {
  const state = ref(await IPC.send("getIsDarkMode"));
  applyStyle(state.value ? defaultStyles.dark : defaultStyles.light);
  IPC.on("darkMode", (_, value) => {
    state.value = value;
    applyStyle(value ? defaultStyles.dark : defaultStyles.light);
  });
  return {
    state: readonly(state),
  };
}
export type DarkModeStore = Awaited<ReturnType<typeof createDarkModeStore>>;
export const darkModeStoreKey: InjectionKey<DarkModeStore> = Symbol("darkModeStore");
