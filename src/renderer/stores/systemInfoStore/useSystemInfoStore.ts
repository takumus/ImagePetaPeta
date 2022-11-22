import { inject } from "@/renderer/utils/vue";

import { systemInfoStoreKey } from "@/renderer/stores/systemInfoStore/createSystemInfoStore";

export function useSystemInfoStore() {
  return inject(systemInfoStoreKey);
}
