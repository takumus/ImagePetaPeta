import EventEmitter from "events";
import TypedEmitter, { EventMap } from "typed-emitter";
export class TypedEventEmitter<T extends EventMap> extends (EventEmitter as {
  new <T extends EventMap>(): TypedEmitter<T>;
})<T> {
  constructor() {
    super();
    this.setMaxListeners(0);
  }
}
