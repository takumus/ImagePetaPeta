import { InjectionKey, inject as _inject } from "vue";

export function inject<T>(key: InjectionKey<T>) {
  const state = _inject(key);
  if (state === undefined) {
    throw new Error(`Could not inject "${key.toString()}"`);
  }
  return state;
}
