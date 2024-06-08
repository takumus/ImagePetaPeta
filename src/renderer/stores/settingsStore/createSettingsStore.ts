import { watch as _watch, InjectionKey, ref } from "vue";

import { IPC } from "@/renderer/libs/ipc";

export async function createSettingsStore() {
  const states = ref(await IPC.common.getSettings());
  const watch = () => {
    return _watch(
      states,
      (value) => {
        IPC.common.updateSettings(value);
      },
      {
        deep: true,
      },
    );
  };
  // watch開始。
  let unwatch = watch();
  IPC.on("updateSettings", (_event, _states) => {
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
export type SettingsStore = Awaited<ReturnType<typeof createSettingsStore>>;
export const settingsStoreKey: InjectionKey<SettingsStore> = Symbol("settingsStore");
