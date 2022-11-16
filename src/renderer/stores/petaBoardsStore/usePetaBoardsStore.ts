import { petaBoardsStoreKey } from "@/renderer/stores/petaBoardsStore/createPetaBoardsStore";
import { inject } from "@/renderer/utils/vue";

export function usePetaBoardsStore() {
  return inject(petaBoardsStoreKey);
}
