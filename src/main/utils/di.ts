/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
const map: { [key: string]: any } = {};

interface Key<T> {
  key: string;
  __t?: T;
}
export function createKey<T>(key: string): Key<T> {
  return {
    key,
  };
}
export function provide<T>(key: Key<T>, instance: T) {
  map[key.key] = instance;
}
export function inject<T>(key: Key<T>): T {
  const instance = map[key.key];
  if (instance === undefined) {
    throw new Error(`Could not inject ${key.key}`);
  }
  return instance;
}
