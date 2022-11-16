import { systemInfoStoreKey } from "@/renderer/stores/systemInfoStore/createSystemInfoStore";
import { inject } from "@/renderer/utils/vue";

export function useSystemInfoStore() {
  return inject(systemInfoStoreKey);
}
