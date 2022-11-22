import { inject } from "@/renderer/utils/vue";

import { petaImagesStoreKey } from "@/renderer/stores/petaImagesStore/createPetaImagesStore";

export function usePetaImagesStore() {
  return inject(petaImagesStoreKey);
}
