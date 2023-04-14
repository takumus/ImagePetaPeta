/* eslint-disable @typescript-eslint/no-explicit-any */
type TypedWebWorker<I, O> = {
  postMessage(message: O, transfer: Transferable[]): void;
  postMessage(message: O, options?: StructuredSerializeOptions): void;
  terminate(): void;
  addEventListener<K extends keyof WorkerEventMap>(
    type: K,
    listener: (this: Worker, ev: WorkerEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions,
  ): void;
  addEventListener(
    event: "message",
    callback: (e: MessageEvent<I>) => void,
    options?: boolean | AddEventListenerOptions,
  ): void;
  removeEventListener<K extends keyof WorkerEventMap>(
    type: K,
    listener: (this: Worker, ev: WorkerEventMap[K]) => any,
    options?: boolean | EventListenerOptions,
  ): void;
};
export function initWebWorker<ToWorker, ToMain>(
  self: any,
  init: (self: TypedWebWorker<ToWorker, ToMain>) => void,
) {
  init(self);
  return {} as { new (): TypedWebWorker<ToMain, ToWorker> };
}
