import { InjectionKey, readonly, ref } from "vue";

import * as defines from "@/commons/defines";

export async function createDefinesStore() {
  return {
    defines: readonly(ref(defines)),
  };
}
export type DefinesStore = Awaited<ReturnType<typeof createDefinesStore>>;
export const definesStoreKey: InjectionKey<DefinesStore> = Symbol("definesStore");
