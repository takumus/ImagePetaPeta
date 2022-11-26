/* eslint-disable @typescript-eslint/no-explicit-any */
import { MessagePort, Worker as WorkerThreads } from "worker_threads";

export type TypedWorkerThreads<I, O> = {
  postMessage(data: O): void;
  addListener(event: "message", callback: (e: I) => any): void;
  once(event: "message", callback: (e: I) => any): TypedWorkerThreads<I, O>;
  on(event: "message", listener: (e: I) => any): TypedWorkerThreads<I, O>;
} & WorkerThreads;
export type TypedWorkerThreadsMessagePort<I, O> = {
  postMessage(data: O): void;
  addEventListener(event: "message", callback: (e: MessageEvent<I>) => void): void;
  once(
    event: "message",
    callback: (e: MessageEvent<I>) => void,
  ): TypedWorkerThreadsMessagePort<I, O>;
  on(event: "message", callback: (e: I) => void): TypedWorkerThreadsMessagePort<I, O>;
} & MessagePort;
export type WorkerThreadsOutputType<T extends { new (): TypedWorkerThreads<any, any> }> =
  T extends {
    new (): TypedWorkerThreads<infer R, any>;
  }
    ? R
    : unknown;
export type WorkerThreadsInputType<T extends { new (): TypedWorkerThreads<any, any> }> = T extends {
  new (): TypedWorkerThreads<any, infer R>;
}
  ? R
  : unknown;
export function initWorkerThreads<ToWorker, ToMain>(
  parentPort: any,
  init: (parentPort: TypedWorkerThreadsMessagePort<ToWorker, ToMain>) => void,
) {
  init(parentPort);
  return {} as { new (): TypedWorkerThreads<ToMain, ToWorker> };
}
