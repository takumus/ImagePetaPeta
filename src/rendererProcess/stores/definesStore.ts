import { InjectionKey, readonly, ref } from "vue";
import { inject } from "@/rendererProcess/utils/vue";
import * as defines from "@/commons/defines";
export async function createDefinesStore() {
  return {
    defines: readonly(ref(defines)),
  };
}
export function useDefinesStore() {
  return inject(definesStoreKey);
}
export type DefinesStore = Awaited<ReturnType<typeof createDefinesStore>>;
export const definesStoreKey: InjectionKey<DefinesStore> = Symbol("definesStore");
