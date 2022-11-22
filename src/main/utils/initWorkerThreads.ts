/* eslint-disable @typescript-eslint/no-explicit-any */
import { MessagePort, Worker as WorkerThreads } from "worker_threads";

type TypedWorkerThreads<I, O> = {
  postMessage(data: O): void;
  addListener(event: "message", callback: (e: I) => any): void;
  once(event: "message", callback: (e: I) => any): TypedWorkerThreads<I, O>;
  on(event: "message", listener: (e: I) => any): TypedWorkerThreads<I, O>;
} & WorkerThreads;
type TypedMessagePort<I, O> = {
  postMessage(data: O): void;
  addEventListener(event: "message", callback: (e: MessageEvent<I>) => void): void;
  once(event: "message", callback: (e: MessageEvent<I>) => void): TypedMessagePort<I, O>;
  on(event: "message", callback: (e: I) => void): TypedMessagePort<I, O>;
} & MessagePort;
export function initWorkerThreads<ToWorker, ToMain>(
  parentPort: any,
  init: (parentPort: TypedMessagePort<ToWorker, ToMain>) => void,
) {
  init(parentPort);
  return {} as { new (): TypedWorkerThreads<ToMain, ToWorker> };
}
