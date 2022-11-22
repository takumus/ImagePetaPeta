import { inject } from "@/renderer/utils/vue";

import { textsStoreKey } from "@/renderer/stores/textsStore/createTextsStore";

export function useTextsStore() {
  return inject(textsStoreKey);
}
