import { inject } from "@/renderer/utils/vue";

import { petaBoardsStoreKey } from "@/renderer/stores/petaBoardsStore/createPetaBoardsStore";

export function usePetaBoardsStore() {
  return inject(petaBoardsStoreKey);
}
