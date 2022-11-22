/* eslint-disable @typescript-eslint/no-explicit-any */
export class WorkerThreads<T> {
  private _idle = true;
  constructor(public readonly worker: T) {
    //
  }
  use() {
    this._idle = false;
  }
  unuse() {
    this._idle = true;
  }
  public get idle() {
    return this._idle;
  }
}
export function createWorkerThreadsGroup<T>(WorkerClass: { new (): T }) {
  const wts: { [key: number]: WorkerThreads<T> } = {};
  function getWT() {
    const wt = Object.values(wts).find((worker) => worker.idle);
    if (wt === undefined) {
      const newWT = new WorkerThreads<T>(new WorkerClass());
      const id = (newWT.worker as any).threadId;
      (newWT.worker as any).on("exit", () => {
        delete wts[id];
      });
      wts[id] = newWT;
      return newWT;
    }
    return wt;
  }
  return {
    getWT,
  };
}