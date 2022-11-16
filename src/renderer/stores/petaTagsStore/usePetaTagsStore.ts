import { petaTagsStoreKey } from "@/renderer/stores/petaTagsStore/createPetaTagsStore";
import { inject } from "@/renderer/utils/vue";

export function usePetaTagsStore() {
  return inject(petaTagsStoreKey);
}
