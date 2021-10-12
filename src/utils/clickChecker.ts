import { CLICK_OFFSET } from "@/defines";
import { Vec2, XYObject } from "@/utils/vec2";
export class ClickChecker {
  clickPosition = new Vec2();
  click = false;
  down(point: XYObject) {
    this.clickPosition = new Vec2(point);
    this.click = true;
  }
  move(point: XYObject) {
    if (this.clickPosition.getDistance(point) > CLICK_OFFSET) {
      this.click = false;
    }
  }
  get isClick() {
    return this.click;
  }
}