import { CLICK_OFFSET } from "@/commons/defines";
import { TypedEventEmitter } from "@/commons/utils/typedEventEmitter";
import { Vec2, vec2FromPointerEvent } from "@/commons/utils/vec2";
type MessageEvents = {
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  startDrag: (event: PointerEvent) => void;
  click: (event: PointerEvent) => void;
};
export class ClickChecker extends TypedEventEmitter<MessageEvents> {
  private static point: Vec2 = new Vec2();
  public static init() {
    window.addEventListener("pointermove", (event) => {
      ClickChecker.point = vec2FromPointerEvent(event);
    });
  }
  clickPosition = new Vec2();
  click = false;
  down() {
    this.clickPosition = ClickChecker.point.clone();
    this.click = true;
    window.addEventListener("pointermove", this.move);
    window.addEventListener("pointerup", this.up);
  }
  private move = (event: PointerEvent) => {
    if (this.clickPosition.getDistance(vec2FromPointerEvent(event)) > CLICK_OFFSET) {
      this.click = false;
      this.emit("startDrag", event);
      this.remove();
    }
  };
  private up = (event: PointerEvent) => {
    if (this.click) {
      this.emit("click", event);
    }
    this.remove();
  };
  private remove() {
    this.removeAllListeners();
    window.removeEventListener("pointermove", this.move);
    window.removeEventListener("pointerup", this.up);
  }
  get isClick() {
    return this.click;
  }
}
