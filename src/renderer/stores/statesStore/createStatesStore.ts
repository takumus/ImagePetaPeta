import { InjectionKey, watch as _watch, ref } from "vue";

import { IPC } from "@/renderer/ipc";

export async function createStatesStore() {
  const states = ref(await IPC.send("getStates"));
  const watch = () => {
    return _watch(
      states,
      (value) => {
        IPC.send("updateStates", value);
      },
      {
        deep: true,
      },
    );
  };
  // watch開始。
  let unwatch = watch();
  IPC.on("updateStates", (_event, _states) => {
    // メインプロセス側からの変更はunwatch
    unwatch();
    // レンダラに適用
    states.value = _states;
    // watch again
    unwatch = watch();
  });
  return {
    state: states,
  };
}
export type StatesStore = Awaited<ReturnType<typeof createStatesStore>>;
export const statesStoreKey: InjectionKey<StatesStore> = Symbol("statesStore");
