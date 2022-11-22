import { inject } from "@/renderer/utils/vue";

import { nsfwStoreKey } from "@/renderer/stores/nsfwStore/createNSFWStore";

export function useNSFWStore() {
  return inject(nsfwStoreKey);
}
