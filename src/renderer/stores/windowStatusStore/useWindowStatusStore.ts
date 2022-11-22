import { inject } from "@/renderer/utils/vue";

import { windowStatusStoreKey } from "@/renderer/stores/windowStatusStore/createWindowStatusStore";

export function useWindowStatusStore() {
  return inject(windowStatusStoreKey);
}
