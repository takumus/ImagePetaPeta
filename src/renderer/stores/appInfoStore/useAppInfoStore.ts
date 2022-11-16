import { appInfoStoreKey } from "@/renderer/stores/appInfoStore/createAppInfoStore";
import { inject } from "@/renderer/utils/vue";
export function useAppInfoStore() {
  return inject(appInfoStoreKey);
}
