import { petaImagesStoreKey } from "@/renderer/stores/petaImagesStore/createPetaImagesStore";
import { inject } from "@/renderer/utils/vue";

export function usePetaImagesStore() {
  return inject(petaImagesStoreKey);
}
