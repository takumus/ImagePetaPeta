import { watch as _watch, InjectionKey, ref } from "vue";

import { IPC } from "@/renderer/libs/ipc";

export async function createLibrariesStore() {
  const states = ref(await IPC.libraries.get());
  const watch = () => {
    return _watch(
      states,
      (value) => {
        IPC.libraries.update(value);
      },
      {
        deep: true,
      },
    );
  };
  // watch開始。
  let unwatch = watch();
  IPC.libraries.on("update", (_event, _states) => {
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
export type LibrariesStore = Awaited<ReturnType<typeof createLibrariesStore>>;
export const librariesStoreKey: InjectionKey<LibrariesStore> = Symbol("librariesStore");
