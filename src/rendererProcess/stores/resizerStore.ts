import { EventEmitter } from "eventemitter3";
import TypedEventEmitter from "typed-emitter";
import { onUnmounted } from "vue";

export function useResizerStore() {
  const eventEmitter = new EventEmitter() as TypedEventEmitter<{
    resize: (rect: DOMRectReadOnly) => void;
  }>;
  const resizer = new ResizeObserver((entries) => {
    const rect = entries[0]?.contentRect;
    if (rect) {
      eventEmitter.emit("resize", rect);
    }
  });
  onUnmounted(() => {
    resizer.disconnect();
  });
  return {
    on: eventEmitter.on.bind(eventEmitter),
    observe: (element?: Element) => {
      if (element !== undefined) {
        resizer.observe(element);
      }
    },
  };
}
