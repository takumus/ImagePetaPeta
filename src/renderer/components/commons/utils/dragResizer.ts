import { onUnmounted } from "vue";

import { MouseButton } from "@/commons/datas/mouseButton";

import { useResizerStore } from "@/renderer/stores/resizerStore/useResizerStore";
import { setCursor, setDefaultCursor } from "@/renderer/utils/cursor";

export function setupDragResizer(element: HTMLElement, position: "left" | "right") {
  const resizerStore = useResizerStore();
  resizerStore.observe(element);
  const resizerElement = document.createElement("e-resizer");
  resizerElement.style.position = "fixed";
  resizerElement.style.width = "10px";
  resizerElement.style.backgroundColor = "#ff000000";
  resizerElement.style.transform = "translateX(-50%)";
  resizerElement.style.cursor = "ew-resize";
  element.appendChild(resizerElement);
  resizerStore.on("resize", resize);
  window.addEventListener("resize", resize);
  resizerElement.addEventListener("pointerdown", (event) => {
    if (event.button !== MouseButton.LEFT) {
      return;
    }
    setCursor("ew-resize");
    function move(event: PointerEvent) {
      const rect = element.getBoundingClientRect();
      let width = position === "right" ? event.clientX - rect.left : rect.right - event.clientX;
      width = Math.min(500, Math.max(width, 100));
      element.style.setProperty("width", `${width}px`);
      element.style.setProperty("min-width", `${width}px`);
    }
    function up() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setDefaultCursor();
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  });
  function resize() {
    const rect = element.getBoundingClientRect();
    resizerElement.style.left = (position === "left" ? rect.left : rect.right) + "px";
    resizerElement.style.height = rect.height + "px";
    resizerElement.style.top = rect.y + "px";
  }
  onUnmounted(() => {
    window.removeEventListener("resize", resize);
  });
}
