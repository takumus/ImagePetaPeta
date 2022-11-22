import { onUnmounted } from "vue";

import { TypedEventEmitter } from "@/commons/utils/typedEventEmitter";

export function useResizerStore() {
  const eventEmitter = new TypedEventEmitter<{
    resize: (rect: DOMRectReadOnly) => void;
  }>();
  let _element: Element | undefined;
  const resizer = new ResizeObserver((entries) => {
    const rect = entries[0]?.contentRect;
    if (rect) {
      eventEmitter.emit("resize", rect);
    }
  });
  onUnmounted(() => {
    resizer.disconnect();
    eventEmitter.removeAllListeners();
  });
  function forceEmit() {
    if (_element !== undefined) {
      eventEmitter.emit("resize", _element.getBoundingClientRect());
    }
  }
  return {
    on: eventEmitter.on.bind(eventEmitter),
    observe: (element?: Element, immidiately = true) => {
      if (element !== undefined) {
        _element = element;
        resizer.observe(element);
        if (immidiately) {
          forceEmit();
        }
      }
    },
    forceEmit,
  };
}
