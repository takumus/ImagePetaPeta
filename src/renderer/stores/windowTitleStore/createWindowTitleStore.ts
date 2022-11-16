import { InjectionKey, ref, watch } from "vue";

export async function createWindowTitleStore() {
  const windowTitle = ref("");
  watch(windowTitle, () => {
    document.title = windowTitle.value;
  });
  return {
    windowTitle: ref(windowTitle),
  };
}
export type WindowTitleStore = Awaited<ReturnType<typeof createWindowTitleStore>>;
export const windowTitleStoreKey: InjectionKey<WindowTitleStore> = Symbol("windowTitleStore");
