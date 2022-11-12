type _WorkerThreads = import("worker_threads").Worker;
type _WorkerThreadsMessagePort = import("worker_threads").MessagePort;
interface _WT<I, O> extends _WorkerThreads {
  postMessage(data: O): void;
  addEventListener(event: "message", callback: (e: I) => void): void;
  addEventListener(event: unknown, callback: unknown): void;
  once(event: "message", callback: (e: I) => void): _WorkerThreads;
  once(...args: unknown[]): _WorkerThreads;
  on(event: "message", callback: (e: I) => void): _WorkerThreads;
  on(...args: unknown[]): _WorkerThreads;
}
interface _WTMP<I, O> extends _WorkerThreadsMessagePort {
  postMessage(data: O): void;
  addEventListener(event: "message", callback: (e: MessageEvent<I>) => void): void;
  addEventListener(...args: unknown[]): void;
  once(event: "message", callback: (e: MessageEvent<I>) => void): _WorkerThreadsMessagePort;
  once(...args: unknown[]): _WorkerThreadsMessagePort;
  on(event: "message", callback: (e: I) => void): _WorkerThreadsMessagePort;
  on(...args: unknown[]): _WorkerThreadsMessagePort;
}
declare interface WorkerThreadsTypeFrom<ToWorker, ToMain> {
  InWorker: _WTMP<ToWorker, ToMain>;
  InMain: { new (): _WT<ToMain, ToWorker> };
}
