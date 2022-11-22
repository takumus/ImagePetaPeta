import { inject } from "@/renderer/utils/vue";

import { definesStoreKey } from "@/renderer/stores/definesStore/createDefinesStore";

export function useDefinesStore() {
  return inject(definesStoreKey);
}
