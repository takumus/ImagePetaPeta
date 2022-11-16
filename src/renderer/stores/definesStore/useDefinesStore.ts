import { definesStoreKey } from "@/renderer/stores/definesStore/createDefinesStore";
import { inject } from "@/renderer/utils/vue";

export function useDefinesStore() {
  return inject(definesStoreKey);
}
