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
  if (map[key.key] !== undefined) {
    throw new Error(`DI: ${key.key} is already exists`);
  }
  map[key.key] = instance;
}
export function inject<T>(key: Key<T>): T {
  const instance = map[key.key];
  if (instance === undefined) {
    throw new Error(`DI: Could not inject ${key.key}`);
  }
  return instance;
}
export function createUseFunction<T>(key: Key<T>) {
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  let instance: T | undefined = undefined;
  return (cache = true) => {
    if (instance === undefined || !cache) {
      instance = inject(key);
    }
    return instance;
  };
}
