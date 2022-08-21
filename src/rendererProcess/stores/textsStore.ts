import { InjectionKey, readonly, ref } from "vue";
import { inject } from "@/rendererProcess/utils/vue";

export async function createTextsStore() {
  return {
    state: readonly(
      ref({
        close: "✕",
        plus: "＋",
      }),
    ),
  };
}
export function useTextsStore() {
  return inject(textsStoreKey);
}
export type TextsStore = Awaited<ReturnType<typeof createTextsStore>>;
export const textsStoreKey: InjectionKey<TextsStore> = Symbol("textsStore");
