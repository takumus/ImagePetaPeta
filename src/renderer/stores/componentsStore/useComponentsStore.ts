import { componentsStoreKey } from "@/renderer/stores/componentsStore/createComponentsStore";
import { inject } from "@/renderer/utils/vue";
export function useComponentsStore() {
  return inject(componentsStoreKey);
}
