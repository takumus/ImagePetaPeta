import { InjectionKey, readonly, ref } from 'vue';
import { API } from '../api';
import { inject } from '../utils/vue';

export function createDarkModeStore() {
  const state = ref(false);
  API.on("darkMode", (_, value) => {
    state.value = value;
  });
  API.send("getIsDarkMode").then((value) => {
    state.value = value;
  });
  return {
    darkMode: readonly(state)
  }
}
export function useDarkModeStore() {
  return inject(darkModeStoreKey);
}
export type DarkModeStore = ReturnType<typeof createDarkModeStore>;
export const darkModeStoreKey: InjectionKey<DarkModeStore> = Symbol("darkModeStore");