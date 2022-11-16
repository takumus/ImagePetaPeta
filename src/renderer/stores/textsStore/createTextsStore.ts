import { InjectionKey, readonly, ref } from "vue";

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
export type TextsStore = Awaited<ReturnType<typeof createTextsStore>>;
export const textsStoreKey: InjectionKey<TextsStore> = Symbol("textsStore");
