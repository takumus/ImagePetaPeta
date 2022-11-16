import { windowTitleStoreKey } from "@/renderer/stores/windowTitleStore/createWindowTitleStore";
import { inject } from "@/renderer/utils/vue";

export function useWindowTitleStore() {
  return inject(windowTitleStoreKey);
}
