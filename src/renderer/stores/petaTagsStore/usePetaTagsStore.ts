import { inject } from "@/renderer/utils/vue";

import { petaTagsStoreKey } from "@/renderer/stores/petaTagsStore/createPetaTagsStore";

export function usePetaTagsStore() {
  return inject(petaTagsStoreKey);
}
