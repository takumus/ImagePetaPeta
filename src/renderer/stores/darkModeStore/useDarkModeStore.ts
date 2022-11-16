import { darkModeStoreKey } from "@/renderer/stores/darkModeStore/createDarkModeStore";
import { inject } from "@/renderer/utils/vue";
export function useDarkModeStore() {
  return inject(darkModeStoreKey);
}
