import { windowTypeStoreKey } from "@/renderer/stores/windowTypeStore/createWindowTypeStore";
import { inject } from "@/renderer/utils/vue";

export function useWindowTypeStore() {
  return inject(windowTypeStoreKey);
}
