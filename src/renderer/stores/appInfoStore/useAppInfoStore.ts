import { inject } from "@/renderer/utils/vue";

import { appInfoStoreKey } from "@/renderer/stores/appInfoStore/createAppInfoStore";

export function useAppInfoStore() {
  return inject(appInfoStoreKey);
}
