/* eslint-disable @typescript-eslint/no-explicit-any */
interface OnMessage<I> extends Worker {
  onmessage: (e: MessageEvent<I>) => void;
}
type TypedWebWorker<I, O> = {
  postMessage(data: O): void;
  addEventListener(event: "message", callback: (e: MessageEvent<I>) => void): void;
} & OnMessage<I>;
export function initWebWorkerThreads<ToWorker, ToMain>(
  self: any,
  init: (self: TypedWebWorker<ToWorker, ToMain>) => void,
) {
  init(self);
  return {} as { new (): TypedWebWorker<ToMain, ToWorker> };
}
