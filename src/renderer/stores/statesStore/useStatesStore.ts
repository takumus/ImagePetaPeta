import { statesStoreKey } from "@/renderer/stores/statesStore/createStatesStore";
import { inject } from "@/renderer/utils/vue";
export function useStateStore() {
  return inject(statesStoreKey);
}
