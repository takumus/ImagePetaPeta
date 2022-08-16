import { reactive, InjectionKey, readonly, inject } from 'vue';
import { API } from '../api';
type DarkModeState = {
  darkMode: boolean
};
export const createDarkModeState = () => {
  const state = reactive<DarkModeState>({
    darkMode: false,
  });
  API.on("darkMode", (event, value) => {
    state.darkMode = value;
  });
  API.send("getIsDarkMode").then((value) => {
    state.darkMode = value;
  });
  return {
    state: readonly(state)
  }
};
export type DarkModeStateType = ReturnType<typeof createDarkModeState>;
export const darkModeStateKey: InjectionKey<DarkModeStateType> = Symbol('darkModeState');
export const useDarkModeState = () => {
  const state = inject(darkModeStateKey);
  if (state === undefined) {
    throw new Error("state " + darkModeStateKey.toString() + " is not ready");
  }
  return state;
}