import { InjectionKey } from "vue";

import { useStore } from "@/renderer/contexts/StoreContext";

export { useStore };

export function inject<T>(key: InjectionKey<T>) {
  return useStore<T>(key);
}
