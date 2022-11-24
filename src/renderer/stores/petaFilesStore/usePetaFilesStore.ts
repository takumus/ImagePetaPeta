import { inject } from "@/renderer/utils/vue";

import { petaFilesStoreKey } from "@/renderer/stores/petaFilesStore/createPetaFilesStore";

export function usePetaFilesStore() {
  return inject(petaFilesStoreKey);
}
