import { textsStoreKey } from "@/renderer/stores/textsStore/createTextsStore";
import { inject } from "@/renderer/utils/vue";

export function useTextsStore() {
  return inject(textsStoreKey);
}
