import { InjectionKey, readonly, ref } from "vue";

import { IPC } from "@/renderer/libs/ipc";
import { applyStyle, Style } from "@/renderer/styles/styles";

export async function createStyleStore() {
  const state = ref(await IPC.getStyle());
  applyStyle(state.value);
  IPC.on("style", (_, value) => {
    state.value = value;
    applyStyle(state.value);
  });
  return {
    style: readonly(state),
  };
}
export type StyleStore = Awaited<ReturnType<typeof createStyleStore>>;
export const styleStoreKey: InjectionKey<StyleStore> = Symbol("styleStore");
