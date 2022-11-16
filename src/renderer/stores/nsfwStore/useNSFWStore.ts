import { nsfwStoreKey } from "@/renderer/stores/nsfwStore/createNSFWStore";
import { inject } from "vue";

export function useNSFWStore() {
  return inject(nsfwStoreKey);
}
