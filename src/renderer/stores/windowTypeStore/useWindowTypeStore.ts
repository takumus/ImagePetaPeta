import { inject } from "@/renderer/utils/vue";

import { windowTypeStoreKey } from "@/renderer/stores/windowTypeStore/createWindowTypeStore";

export function useWindowTypeStore() {
  return inject(windowTypeStoreKey);
}
