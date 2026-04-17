export interface KeyStoreCreatorPair<T> {
  key: symbol;
  creator: () => Promise<T>;
}
export function keyStoreCreatorPair<T>(key: symbol, creator: () => Promise<T>) {
  return {
    key,
    creator,
  } as KeyStoreCreatorPair<T>;
}
