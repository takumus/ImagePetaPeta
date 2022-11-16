import { nsfwStoreKey } from "@/renderer/stores/nsfwStore/createNSFWStore";
import { inject } from "@/renderer/utils/vue";

export function useNSFWStore() {
  return inject(nsfwStoreKey);
}
