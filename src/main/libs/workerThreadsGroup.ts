import { resolve } from "node:path";
import { Worker } from "worker_threads";

import { getDirname } from "@/main/utils/dirname";

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
    (this.worker as Worker).terminate();
    this._idle = false;
  }
  public get idle() {
    return this._idle;
  }
}
export function createWorkerThreadsGroup<T>(path?: string) {
  const wts: { [key: number]: WorkerThreads<T> } = {};
  function getWT() {
    const wt = Object.values(wts).find((worker) => worker.idle);
    if (wt === undefined) {
      const newWT = new WorkerThreads<T>(
        new Worker(
          resolve(
            process.env.TEST === "true" ? `./_test/_wt` : getDirname(import.meta.url),
            path ?? "no.mjs",
          ),
        ) as any,
      );
      const id = (newWT.worker as Worker).threadId;
      (newWT.worker as Worker).once("exit", () => {
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
