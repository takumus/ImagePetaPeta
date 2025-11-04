import { inject } from "@/renderer/utils/vue";

import { librariesStoreKey } from "@/renderer/stores/librariesStore/createLibrariesStore";

export function useLibrariesStore() {
  return inject(librariesStoreKey);
}
