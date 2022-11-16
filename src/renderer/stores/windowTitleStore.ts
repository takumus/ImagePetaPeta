import { InjectionKey, ref, watch } from "vue";
import { inject } from "@/renderer/utils/vue";

export async function createWindowTitleStore() {
  const windowTitle = ref("");
  watch(windowTitle, () => {
    document.title = windowTitle.value;
  });
  return {
    windowTitle: ref(windowTitle),
  };
}
export function useWindowTitleStore() {
  return inject(windowTitleStoreKey);
}
export type WindowTitleStore = Awaited<ReturnType<typeof createWindowTitleStore>>;
export const windowTitleStoreKey: InjectionKey<WindowTitleStore> = Symbol("windowTitleStore");
