let map: { [key: string]: unknown } = {};

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
  if (map[key.key] !== undefined) {
    throw new Error(`DI: ${key.key} is already exists`);
  }
  map[key.key] = instance;
}
export function inject<T>(key: Key<T>): T {
  const instance = map[key.key] as T;
  if (instance === undefined) {
    throw new Error(`DI: Could not inject ${key.key}`);
  }
  return instance;
}
export function createUseFunction<T>(key: Key<T>) {
  return () => {
    return inject(key);
  };
}
export function clearProvides() {
  map = {};
}
