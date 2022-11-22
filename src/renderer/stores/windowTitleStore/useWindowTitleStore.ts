import { inject } from "@/renderer/utils/vue";

import { windowTitleStoreKey } from "@/renderer/stores/windowTitleStore/createWindowTitleStore";

export function useWindowTitleStore() {
  return inject(windowTitleStoreKey);
}
