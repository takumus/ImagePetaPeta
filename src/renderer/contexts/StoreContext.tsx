import { createContext, ReactNode, useContext, useMemo } from "react";

type StoreMap = Map<symbol, unknown>;

const StoreContext = createContext<StoreMap | null>(null);

export function StoreProvider({
  stores,
  children,
}: {
  stores: { key: symbol; value: unknown }[];
  children?: ReactNode;
}) {
  const value = useMemo(
    () => new Map(stores.map((store) => [store.key, store.value])),
    [stores],
  );
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore<T>(key: symbol) {
  const stores = useContext(StoreContext);
  if (stores === null) {
    throw new Error("StoreProvider is not mounted");
  }
  const store = stores.get(key);
  if (store === undefined) {
    throw new Error(`Could not inject "${String(key)}"`);
  }
  return store as T;
}
