import { petaTagPartitionsStoreKey } from "@/renderer/stores/petaTagPartitionsStore/createPetaTagPartitionsStore";
import { inject } from "vue";

export function usePetaTagPartitionsStore() {
  return inject(petaTagPartitionsStoreKey);
}
