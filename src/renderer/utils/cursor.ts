import RotateCursor1x from "@/_public/images/cursors/rotate1x.png";
import RotateCursor2x from "@/_public/images/cursors/rotate2x.png";

let locked = false;
export function lock() {
  locked = true;
}
export function unlock() {
  locked = false;
}
export function setCursor(cursor = "unset") {
  if (locked) {
    return;
  }
  window.document.body.style.setProperty("cursor", cursor, "important");
}
export function setDefaultCursor() {
  setCursor("unset");
}
export const cursors = {
  ROTATE_CURSOR: `-webkit-image-set(
    url('${RotateCursor1x}') 1x,
    url('${RotateCursor2x}') 2x
  ) 11 11, auto`,
};
