import { inject } from "@/renderer/utils/vue";

import { statesStoreKey } from "@/renderer/stores/statesStore/createStatesStore";

export function useStateStore() {
  return inject(statesStoreKey);
}
