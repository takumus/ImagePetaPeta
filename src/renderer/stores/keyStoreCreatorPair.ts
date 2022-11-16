import { InjectionKey } from "vue";

export interface KeyStoreCreatorPair<T> {
  key: InjectionKey<T>;
  creator: () => Promise<T>;
}
export function keyStoreCreatorPair<T>(key: InjectionKey<T>, creator: () => Promise<T>) {
  return {
    key,
    creator,
  } as KeyStoreCreatorPair<T>;
}
