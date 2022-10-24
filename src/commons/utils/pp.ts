import pLimit from "p-limit";
export class PPCancelError extends Error {
  constructor(public readonly all: number, public readonly remaining: number) {
    super("PPCancelError");
  }
}
export function ppa<T, K>(
  cb: (data: T, index: number) => Promise<K>,
  arr: T[],
  concurrency: number,
  resolveCancelationOnNextTick = true,
) {
  const result = pp(
    arr.map((value: T, index: number) => () => {
      return cb(value, index);
    }),
    concurrency,
    resolveCancelationOnNextTick,
  );
  return {
    promise: result.promise,
    cancel: result.cancel,
  };
}
export function pp<T extends readonly (() => unknown)[] | []>(
  promises: T,
  concurrency: number,
  resolveCancelationOnNextTick = true,
) {
  if (concurrency < 1) {
    throw new Error(`concurrency must be larger than 1`);
  }
  const limit = pLimit(concurrency);
  const cancels: ((error: PPCancelError) => void)[] = [];
  const resolveCancels: (() => void)[] = [];
  let allCanceled = false;
  let completed = false;
  let remaining = 0;
  const _promises = [...promises];
  const promise = Promise.all(
    _promises.map(
      (promise) =>
        new Promise((res, rej: (error: PPCancelError) => void) => {
          let canceled = false;
          limit(promise).then((v) => {
            if (canceled) {
              return "";
            }
            res(v);
            if (limit.activeCount + limit.pendingCount === 0) {
              // 実行済み、ペンディングがゼロなら完了。
              if (allCanceled) {
                // キャンセルされてたらエラー。
                const error = new PPCancelError(_promises.length, remaining);
                cancels.map((cancel) => {
                  cancel(error);
                });
                // nextTickで呼ぶか分ける。
                if (resolveCancelationOnNextTick) {
                  setImmediate(() => {
                    resolveCancels.map((rc) => rc());
                  });
                } else {
                  resolveCancels.map((rc) => rc());
                }
              }
              completed = true;
            }
          });
          cancels.push((error) => {
            canceled = true;
            rej(error);
          });
        }),
    ),
  );
  return {
    promise: promise as Promise<{ readonly [P in keyof T]: Awaited<ReturnType<T[P]>> }>,
    cancel: async () => {
      if (completed) {
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
