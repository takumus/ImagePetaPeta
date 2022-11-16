import { petaTagPartitionsStoreKey } from "@/renderer/stores/petaTagPartitionsStore/createPetaTagPartitionsStore";
import { inject } from "@/renderer/utils/vue";

export function usePetaTagPartitionsStore() {
  return inject(petaTagPartitionsStoreKey);
}
