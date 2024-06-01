/* eslint-disable @typescript-eslint/no-explicit-any */
import { MessagePort, parentPort, TransferListItem, Worker as WorkerThreads } from "worker_threads";

import { TypedEventEmitter } from "@/commons/utils/typedEventEmitter";

export type TypedWorkerThreadsMessage<I, O> = {
  toMain: I;
  toWorker: O;
};
export class TypedWorkerThreadsParentPort<ToWorker, ToMain> extends TypedEventEmitter<{
  message: (param: ToWorker) => void;
}> {
  constructor(public port: MessagePort) {
    super();
    port.on("message", (data) => {
      this.emit("message", data);
    });
  }
  postMessage(data: ToMain, transferList?: readonly TransferListItem[]) {
    this.port.postMessage(data, transferList);
  }
}
export function initWorkerThreads<ToWorker, ToMain>(
  init: (parentPort: TypedWorkerThreadsParentPort<ToWorker, ToMain>) => void,
): TypedWorkerThreadsMessage<ToMain, ToWorker>;
export function initWorkerThreads<Func extends (arg: any) => any>(
  init: (
    parentPort: TypedWorkerThreadsParentPort<Parameters<Func>[0], Awaited<ReturnType<Func>>>,
  ) => void,
): TypedWorkerThreadsMessage<Awaited<ReturnType<Func>>, Parameters<Func>[0]>;
export function initWorkerThreads<ToWorker, ToMain>(
  init: (parentPort: TypedWorkerThreadsParentPort<ToWorker, ToMain>) => void,
): TypedWorkerThreadsMessage<ToMain, ToWorker> {
  init(parentPort as any);
  return undefined as any;
}
