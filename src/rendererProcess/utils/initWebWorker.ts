/* eslint-disable @typescript-eslint/no-explicit-any */
interface _W<I, O> extends Worker {
  postMessage(data: O): void;
  addEventListener(event: "message", callback: (e: MessageEvent<I>) => void): void;
  addEventListener(event: unknown, callback: unknown): void;
  onmessage: (e: MessageEvent<I>) => void;
}
export function initWebWorkerThreads<ToWorker, ToMain>(
  self: any,
  init: (self: _W<ToWorker, ToMain>) => void,
) {
  init(self);
  return {} as { new (): _W<ToMain, ToWorker> };
}
