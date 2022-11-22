import { inject } from "@/renderer/utils/vue";

import { petaTagPartitionsStoreKey } from "@/renderer/stores/petaTagPartitionsStore/createPetaTagPartitionsStore";

export function usePetaTagPartitionsStore() {
  return inject(petaTagPartitionsStoreKey);
}
