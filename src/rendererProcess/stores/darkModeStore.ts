import { InjectionKey, readonly, ref } from "vue";
import { API } from "@/rendererProcess/api";
import { inject } from "@/rendererProcess/utils/vue";

export async function createDarkModeStore() {
  const state = ref(await API.send("getIsDarkMode"));
  API.on("darkMode", (_, value) => {
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
