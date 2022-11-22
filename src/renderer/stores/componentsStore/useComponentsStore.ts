import { inject } from "@/renderer/utils/vue";

import { componentsStoreKey } from "@/renderer/stores/componentsStore/createComponentsStore";

export function useComponentsStore() {
  return inject(componentsStoreKey);
}
