import { inject } from "@/renderer/utils/vue";

import { windowNameStoreKey } from "@/renderer/stores/windowNameStore/createWindowNameStore";

export function useWindowNameStore() {
  return inject(windowNameStoreKey);
}
