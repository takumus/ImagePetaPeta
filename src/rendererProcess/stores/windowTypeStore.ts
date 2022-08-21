import { InjectionKey, readonly, ref } from "vue";
import { inject } from "@/rendererProcess/utils/vue";
import { WindowType } from "@/commons/datas/windowType";

export async function createWindowTypeStore(windowType: WindowType) {
  return {
    windowType: readonly(ref(windowType)),
  };
}
export function useWindowTypeStore() {
  return inject(windowTypeStoreKey);
}
export type WindowTypeStore = Awaited<ReturnType<typeof createWindowTypeStore>>;
export const windowTypeStoreKey: InjectionKey<WindowTypeStore> = Symbol("windowTypeStore");
