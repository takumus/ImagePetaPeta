/* eslint-disable @typescript-eslint/no-explicit-any */
import { Worker as _WorkerThreads } from "worker_threads";
type _WorkerThreadsMessagePort = import("worker_threads").MessagePort;
interface _WT<I, O> extends _WorkerThreads {
  postMessage(data: O): void;
  addListener(event: "message", callback: (e: I) => any): this;
  addListener(...args: any): this;
  once(event: "message", callback: (e: I) => any): this;
  once(...args: any): this;
  on(event: "message", callback: (e: I) => any): this;
  on(...args: any): this;
}
interface _WTMP<I, O> extends _WorkerThreadsMessagePort {
  postMessage(data: O): void;
  addEventListener(event: "message", callback: (e: MessageEvent<I>) => void): void;
  addEventListener(...args: unknown[]): void;
  once(event: "message", callback: (e: MessageEvent<I>) => void): _WorkerThreadsMessagePort;
  once(...args: any): this;
  on(event: "message", callback: (e: I) => void): _WorkerThreadsMessagePort;
  on(...args: any): this;
}
export function initWorkerThreads<ToWorker, ToMain>(
  parentPort: any,
  init: (parentPort: _WTMP<ToWorker, ToMain>) => void,
) {
  init(parentPort);
  return {} as { new (): _WT<ToMain, ToWorker> };
}
