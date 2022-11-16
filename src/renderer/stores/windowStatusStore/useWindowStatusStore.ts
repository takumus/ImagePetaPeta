import { windowStatusStoreKey } from "@/renderer/stores/windowStatusStore/createWindowStatusStore";
import { inject } from "@/renderer/utils/vue";

export function useWindowStatusStore() {
  return inject(windowStatusStoreKey);
}
