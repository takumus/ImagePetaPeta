import { Worker as WorkerThread } from "worker_threads";
export class WT<T extends WorkerThread> {
  private _idle = true;
  constructor(public readonly worker: T) {
    // console.log("NEW WTMOTHER!!!:", worker.threadId);
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
export function createWorkerThreadsGroup<T extends WorkerThread>(WorkerClass: { new (): T }) {
  const wts: { [key: number]: WT<T> } = {};
  function getWT() {
    const wt = Object.values(wts).find((worker) => worker.idle);
    if (wt === undefined) {
      const newWT = new WT<T>(new WorkerClass());
      const id = newWT.worker.threadId;
      newWT.worker.on("exit", () => {
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
