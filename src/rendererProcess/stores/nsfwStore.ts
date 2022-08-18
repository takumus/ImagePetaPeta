import { InjectionKey, readonly, ref } from 'vue';
import { API } from '../api';
import { inject } from '../utils/vue';

export function createNSFWStore() {
  const state = ref(false);
  API.on("showNSFW", (_, value) => {
    state.value = value;
  });
  API.send("getShowNSFW").then((value) => {
    state.value = value;
  });
  function update(value: boolean) {
    API.send("setShowNSFW", value);
  }
  return {
    state: readonly(state),
    update
  }
}
export function useNSFWStore() {
  return inject(nsfwStoreKey);
}
export type NSFWStore = ReturnType<typeof createNSFWStore>;
export const nsfwStoreKey: InjectionKey<NSFWStore> = Symbol("nsfwStore");