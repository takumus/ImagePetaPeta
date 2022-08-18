import { InjectionKey, readonly, ref } from "vue";
import { API } from "../api";
import { inject } from "../utils/vue";

export async function createNSFWStore() {
  const state = ref(await API.send("getShowNSFW"));
  API.on("showNSFW", (_, value) => {
    state.value = value;
  });
  function update(value: boolean) {
    API.send("setShowNSFW", value);
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
