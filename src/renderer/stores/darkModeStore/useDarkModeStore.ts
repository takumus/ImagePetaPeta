import { inject } from "@/renderer/utils/vue";

import { darkModeStoreKey } from "@/renderer/stores/darkModeStore/createDarkModeStore";

export function useDarkModeStore() {
  return inject(darkModeStoreKey);
}
