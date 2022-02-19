import RotateCursor1x from "@/assets/rotateCursor1x.png";
import RotateCursor2x from "@/assets/rotateCursor2x.png";
export const ROTATE_CURSOR = `-webkit-image-set(
  url('${RotateCursor1x}') 1x,
  url('${RotateCursor2x}') 2x
) 11 11, auto`;
export function setCursor(cursor: string) {
  window.document.body.style.cursor = cursor;
}
export function setDefaultCursor() {
  window.document.body.style.cursor = "unset";
}