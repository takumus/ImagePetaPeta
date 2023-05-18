import pLimit from "p-limit";

export class PPCancelError extends Error {
  constructor(public readonly all: number, public readonly remaining: number) {
    super("PPCancelError");
  }
}
export function ppa<T, K>(fn: (data: T, index: number) => Promise<K>, array: T[], concurrency = 1) {
  const result = pp(
    array.map((value: T, index: number) => () => {
      return fn(value, index);
    }),
    concurrency,
  );
  return {
    promise: result.promise,
    cancel: result.cancel,
  };
}
export function pp<T extends readonly (() => Promise<unknown>)[] | []>(
  functions: T,
  concurrency = 1,
) {
  if (concurrency < 1) {
    throw new Error(`concurrency must be larger than 1`);
  }
  const limit = pLimit(concurrency);
  const cancels: ((error: PPCancelError) => void)[] = [];
  const resolveCancels: (() => void)[] = [];
  const functionsCopy = [...functions];
  let allCanceled = false;
  let allCompleted = false;
  let remaining = 0;
  const promise = Promise.all(
    functionsCopy.map(
      (promise) =>
        new Promise((res, rej) => {
          let canceled = false;
          limit(promise)
            .then((v) => {
              if (canceled) {
                return;
              }
              res(v);
              if (limit.activeCount + limit.pendingCount === 0) {
                // 実行済み、ペンディングがゼロなら完了。
                if (allCanceled) {
                  // キャンセルされてたらエラー。
                  const error = new PPCancelError(functionsCopy.length, remaining);
                  cancels.map((cancel) => {
                    cancel(error);
                  });
                  resolveCancels.map((rc) => rc());
                }
                allCompleted = true;
              }
            })
            .catch((reason) => {
              rej(reason);
            });
          cancels.push((error) => {
            canceled = true;
            rej(error);
          });
        }),
    ),
  );
  return {
    promise: promise as Promise<{ [P in keyof T]: Awaited<ReturnType<T[P]>> }>,
    cancel: async () => {
      if (allCompleted) {
        return;
      }
      remaining = limit.pendingCount;
      limit.clearQueue();
      allCanceled = true;
      return new Promise<void>((res) => {
        resolveCancels.push(res);
      });
    },
  };
}
