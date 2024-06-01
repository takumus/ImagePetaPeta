import { resolve } from "node:path";
import { TransferListItem } from "node:worker_threads";
import { Worker } from "worker_threads";

import { TypedEventEmitter } from "@/commons/utils/typedEventEmitter";

import { TypedWorkerThreadsMessage } from "@/main/libs/initWorkerThreads";
import { getDirname } from "@/main/utils/dirname";

/* eslint-disable @typescript-eslint/no-explicit-any */
export class TypedWorkerThreads<
  T extends TypedWorkerThreadsMessage<any, any>,
> extends TypedEventEmitter<{
  message: (param: T["toMain"]) => void;
  error: (error: any) => void;
}> {
  private _idle = true;
  constructor(public readonly worker: Worker) {
    super();
    worker.on("message", (message) => {
      this.emit("message", message);
    });
    worker.on("error", (error) => {
      this.emit("error", error);
    });
  }
  use() {
    this._idle = false;
  }
  postMessage(data: T["toWorker"], transferList?: readonly TransferListItem[]) {
    this.worker.postMessage(data, transferList);
  }
  unuse() {
    // this.worker.terminate();
    this._idle = true;
  }
  public get idle() {
    return this._idle;
  }
}
export function createWorkerThreadsGroup<
  WorkerThreadsImportReturnValue extends Promise<{ default: TypedWorkerThreadsMessage<any, any> }>,
  _TypedWorkerThreadsMessage extends TypedWorkerThreadsMessage<
    any,
    any
  > = Awaited<WorkerThreadsImportReturnValue>["default"],
>(source?: WorkerThreadsImportReturnValue) {
  const typedWorkerThreads: {
    [key: number]: TypedWorkerThreads<_TypedWorkerThreadsMessage>;
  } = {};
  function get() {
    const idleWT = Object.values(typedWorkerThreads).find((worker) => worker.idle);
    if (idleWT === undefined) {
      if (typeof source !== "string") {
        throw "TypedWorkerThreads plugin error";
      }
      const newWT = new TypedWorkerThreads<_TypedWorkerThreadsMessage>(
        new Worker(
          resolve(
            process.env.TEST === "true" ? `./_test/_wt` : getDirname(import.meta.url),
            source,
          ),
        ) as any,
      );
      const id = newWT.worker.threadId;
      newWT.worker.once("exit", () => {
        delete typedWorkerThreads[id];
      });
      typedWorkerThreads[id] = newWT;
      return newWT;
    }
    return idleWT;
  }
  return {
    get,
    createUseWorkerThreadFunction: (
      func: (
        data: _TypedWorkerThreadsMessage["toWorker"],
      ) => Promise<_TypedWorkerThreadsMessage["toMain"]>,
    ) => func,
  };
}
