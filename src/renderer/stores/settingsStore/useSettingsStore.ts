import { settingsStoreKey } from "@/renderer/stores/settingsStore/createSettingsStore";
import { inject } from "@/renderer/utils/vue";
export function useSettingsStore() {
  return inject(settingsStoreKey);
}
