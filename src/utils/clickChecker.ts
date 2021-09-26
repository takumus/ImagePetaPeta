import { CLICK_OFFSET } from "@/defines";
import { vec2FromMouseEvent, Vec2 } from "@/utils/vec2";
export class ClickChecker {
  clickPosition = new Vec2();
  click = false;
  down(event: MouseEvent) {
    this.clickPosition = vec2FromMouseEvent(event);
    this.click = true;
  }
  move(event: MouseEvent) {
    if (this.clickPosition.getDistance(vec2FromMouseEvent(event)) > CLICK_OFFSET) {
      this.click = false;
    }
  }
  get isClick() {
    return this.click;
  }
}