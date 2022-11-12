export class WT<T extends Worker> {
  private _idle = true;
  public onTerminate?: () => void;
  constructor(public readonly worker: T) {
    // console.log("new webworker", worker);
  }
  use() {
    this._idle = false;
  }
  unuse() {
    this._idle = true;
  }
  terminate() {
    this.worker.terminate();
    this.onTerminate?.();
  }
  public get idle() {
    return this._idle;
  }
}
export function createWorkerGroup<T extends Worker>(WorkerClass: { new (): T }) {
  const wts: { [key: number]: WT<T> } = {};
  let webWorkerId = 0;
  function getWT() {
    const wt = Object.values(wts).find((worker) => worker.idle);
    if (wt === undefined) {
      const newWT = new WT<T>(new WorkerClass());
      const id = webWorkerId++;
      newWT.onTerminate = () => {
        delete wts[id];
      };
      wts[id] = newWT;
      return newWT;
    }
    return wt;
  }
  return {
    getWT,
  };
}
