import { promiseSerial as _promiseSerial } from "@araki-packages/promise-serial";

export function promiseSerial<T, K>(cb: (data: T, index: number) => Promise<K>, arr: T[]) {
  const result = _promiseSerial(arr.map((value: T, index: number) => () => {
    return cb(value, index);
  }));
  return {
    promise: (result.value as any) as Promise<K[]>,
    cancel: (result.cancel as any) as () => Promise<K[]>
  }
}