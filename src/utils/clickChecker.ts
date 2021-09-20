import { CLICK_OFFSET } from "@/defines";
import { fromMouseEvent, Vec2 } from "@/utils/vec2";
export class ClickChecker {
  clickPosition = new Vec2();
  click = false;
  down(event: MouseEvent) {
    this.clickPosition = fromMouseEvent(event);
    this.click = true;
  }
  move(event: MouseEvent) {
    if (this.clickPosition.getDistance(fromMouseEvent(event)) > CLICK_OFFSET) {
      this.click = false;
    }
  }
  get isClick() {
    return this.click;
  }
}