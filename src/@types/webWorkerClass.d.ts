interface _W<I, O> extends Worker {
  postMessage(data: O): void;
  addEventListener(event: "message", callback: (e: MessageEvent<I>) => void): void;
  addEventListener(event: unknown, callback: unknown): void;
  onmessage: (e: MessageEvent<I>) => void;
}
declare interface WorkerTypeFrom<ToWorker, ToMain> {
  InWorker: _W<ToWorker, ToMain>;
  InMain: { new (): _W<ToMain, ToWorker> };
}
