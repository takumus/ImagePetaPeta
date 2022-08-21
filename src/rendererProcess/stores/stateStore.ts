import { InjectionKey, ref, watch as _watch } from "vue";
import { API } from "@/rendererProcess/api";
import { inject } from "@/rendererProcess/utils/vue";

export async function createStatesStore() {
  const states = ref(await API.send("getStates"));
  const watch = () => {
    return _watch(
      states,
      (value) => {
        API.send("updateStates", value);
      },
      {
        deep: true,
      },
    );
  };
  // watch開始。
  let unwatch = watch();
  API.on("updateStates", (_event, _states) => {
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
export function useStateStore() {
  return inject(statesStoreKey);
}
export type StatesStore = Awaited<ReturnType<typeof createStatesStore>>;
export const statesStoreKey: InjectionKey<StatesStore> = Symbol("statesStore");
