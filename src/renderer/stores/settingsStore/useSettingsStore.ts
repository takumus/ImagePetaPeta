import { inject } from "@/renderer/utils/vue";

import { settingsStoreKey } from "@/renderer/stores/settingsStore/createSettingsStore";

export function useSettingsStore() {
  return inject(settingsStoreKey);
}
