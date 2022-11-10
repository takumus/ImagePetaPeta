import { InjectionKey, ref, watch as _watch } from "vue";
import { IPC } from "@/rendererProcess/ipc";
import { inject } from "@/rendererProcess/utils/vue";

export async function createSettingsStore() {
  const states = ref(await IPC.send("getSettings"));
  const watch = () => {
    return _watch(
      states,
      (value) => {
        IPC.send("updateSettings", value);
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
export function useSettingsStore() {
  return inject(settingsStoreKey);
}
export type SettingsStore = Awaited<ReturnType<typeof createSettingsStore>>;
export const settingsStoreKey: InjectionKey<SettingsStore> = Symbol("settingsStore");
