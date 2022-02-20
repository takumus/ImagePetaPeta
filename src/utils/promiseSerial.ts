export function map<T, K>(cb: (data: T, index: number) => Promise<K>, arr: T[]) {
  return arr.map((value: T, index: number) => () => {
    return cb(value, index);
  });
}