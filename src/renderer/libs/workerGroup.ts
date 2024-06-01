import { TypedEventEmitter } from "@/commons/utils/typedEventEmitter";

import { TypedWebWorkerMessage } from "@/renderer/libs/initWebWorker";

export class TypedWebWorker<T extends TypedWebWorkerMessage<any, any>> extends TypedEventEmitter<{
  message: (param: T["toMain"]) => void;
  error: (error: any) => void;
}> {
  private _idle = true;
  constructor(public readonly worker: Worker) {
    super();
    worker.onmessage = (event) => {
      this.emit("message", event.data);
    };
    worker.onerror = (message) => {
      this.emit("error", message);
    };
  }
  use() {
    this._idle = false;
  }
  postMessage(data: T["toWorker"], transferList?: Transferable[]) {
    this.worker.postMessage(data, transferList ?? []);
  }
  terminate() {
    this.worker.terminate();
    this.onTerminate();
  }
  onTerminate = () => {};
  unuse() {
    // this.worker.terminate();
    this._idle = true;
  }
  public get idle() {
    return this._idle;
  }
}
export function createWebWorkerGroup<T extends TypedWebWorkerMessage<any, any>>(WorkerClass: {
  new (): T;
}) {
  const wts: { [key: number]: TypedWebWorker<T> } = {};
  let webWorkerId = 0;
  function getWT() {
    const wt = Object.values(wts).find((worker) => worker.idle);
    if (wt === undefined) {
      const newWT = new TypedWebWorker<T>(new WorkerClass() as any);
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
