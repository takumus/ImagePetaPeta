/* eslint-disable @typescript-eslint/no-explicit-any */

import { TypedEventEmitter } from "@/commons/utils/typedEventEmitter";

export type TypedWebWorkerMessage<I, O> = {
  toMain: I;
  toWorker: O;
};
export class TypedWebWorkerParentPort<ToWorker, ToMain> extends TypedEventEmitter<{
  message: (param: ToWorker) => void;
}> {
  constructor(public port: Worker) {
    super();
    port.addEventListener("message", (event: MessageEvent) => {
      this.emit("message", event.data);
    });
  }
  postMessage(data: ToMain, transferList?: Transferable[]) {
    this.port.postMessage(data, transferList ?? []);
  }
}
export function initWebWorker<ToWorker, ToMain>(
  init: (self: TypedWebWorkerParentPort<ToWorker, ToMain>) => void,
) {
  init(new TypedWebWorkerParentPort(self as any));
  return {} as { new (): TypedWebWorkerMessage<ToMain, ToWorker> };
}
