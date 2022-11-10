import { InjectionKey, readonly, ref } from "vue";
import { IPC } from "@/rendererProcess/ipc";
import { inject } from "@/rendererProcess/utils/vue";

export async function createDarkModeStore() {
  const state = ref(await IPC.send("getIsDarkMode"));
  IPC.on("darkMode", (_, value) => {
    state.value = value;
  });
  return {
    state: readonly(state),
  };
}
export function useDarkModeStore() {
  return inject(darkModeStoreKey);
}
export type DarkModeStore = Awaited<ReturnType<typeof createDarkModeStore>>;
export const darkModeStoreKey: InjectionKey<DarkModeStore> = Symbol("darkModeStore");
