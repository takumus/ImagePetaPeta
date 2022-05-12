import { promiseSerial as _promiseSerial } from "@araki-packages/promise-serial";

export function promiseSerial<T, K>(cb: (data: T, index: number) => Promise<K>, arr: T[]) {
  const result = _promiseSerial(arr.map((value: T, index: number) => () => {
    return cb(value, index);
  }));
  return {
    promise: result.value,
    cancel: result.cancel
  }
}