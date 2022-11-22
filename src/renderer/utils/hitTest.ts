/* eslint-disable */
//
// https://github.com/wise9/enchant.js/blob/master/dev/src/Entity.js
import { Vec2 } from "@/commons/utils/vec2";

//
interface Rect {
  leftTop: Vec2;
  rightTop: Vec2;
  leftBottom: Vec2;
  rightBottom: Vec2;
}
export function hitTest(rect1: Rect, rect2: Rect) {
  const lt1 = rect1.leftTop,
    rt1 = rect1.rightTop,
    lb1 = rect1.leftBottom,
    rb1 = rect1.rightBottom,
    lt2 = rect2.leftTop,
    rt2 = rect2.rightTop,
    lb2 = rect2.leftBottom,
    rb2 = rect2.rightBottom,
    t1 = [rt1.x - lt1.x, rt1.y - lt1.y],
    r1 = [rb1.x - rt1.x, rb1.y - rt1.y],
    b1 = [lb1.x - rb1.x, lb1.y - rb1.y],
    l1 = [lt1.x - lb1.x, lt1.y - lb1.y],
    t2 = [rt2.x - lt2.x, rt2.y - lt2.y],
    r2 = [rb2.x - rt2.x, rb2.y - rt2.y],
    b2 = [lb2.x - rb2.x, lb2.y - rb2.y],
    l2 = [lt2.x - lb2.x, lt2.y - lb2.y],
    cx1 = (lt1.x + rt1.x + lb1.x + rb1.x) >> 2,
    cy1 = (lt1.y + rt1.y + lb1.y + rb1.y) >> 2,
    cx2 = (lt2.x + rt2.x + lb2.x + rb2.x) >> 2,
    cy2 = (lt2.y + rt2.y + lb2.y + rb2.y) >> 2;
  let i: number,
    j: number,
    poss1: Vec2[],
    poss2: Vec2[],
    dirs1: number[][],
    dirs2: number[][],
    pos1: Vec2,
    pos2: Vec2,
    dir1: number[],
    dir2: number[],
    px1: number,
    py1: number,
    px2: number,
    py2: number,
    dx1: number,
    dy1: number,
    dx2: number,
    dy2: number,
    vx: number,
    vy: number,
    c: number,
    c1: number,
    c2: number;
  if (
    t1[0]! * (cy2 - lt1.y) - t1[1]! * (cx2 - lt1.x) > 0 &&
    r1[0]! * (cy2 - rt1.y) - r1[1]! * (cx2 - rt1.x) > 0 &&
    b1[0]! * (cy2 - rb1.y) - b1[1]! * (cx2 - rb1.x) > 0 &&
    l1[0]! * (cy2 - lb1.y) - l1[1]! * (cx2 - lb1.x) > 0
  ) {
    return true;
  } else if (
    t2[0]! * (cy1 - lt2.y) - t2[1]! * (cx1 - lt2.x) > 0 &&
    r2[0]! * (cy1 - rt2.y) - r2[1]! * (cx1 - rt2.x) > 0 &&
    b2[0]! * (cy1 - rb2.y) - b2[1]! * (cx1 - rb2.x) > 0 &&
    l2[0]! * (cy1 - lb2.y) - l2[1]! * (cx1 - lb2.x) > 0
  ) {
    return true;
  } else {
    poss1 = [lt1, rt1, rb1, lb1];
    poss2 = [lt2, rt2, rb2, lb2];
    dirs1 = [t1, r1, b1, l1];
    dirs2 = [t2, r2, b2, l2];
    for (i = 0; i < 4; i++) {
      pos1 = poss1[i]!;
      px1 = pos1.x;
      py1 = pos1.y;
      dir1 = dirs1[i]!;
      dx1 = dir1[0]!;
      dy1 = dir1[1]!;
      for (j = 0; j < 4; j++) {
        pos2 = poss2[j]!;
        px2 = pos2.x;
        py2 = pos2.y;
        dir2 = dirs2[j]!;
        dx2 = dir2[0]!;
        dy2 = dir2[1]!;
        c = dx1 * dy2 - dy1 * dx2;
        if (c !== 0) {
          vx = px2 - px1;
          vy = py2 - py1;
          c1 = (vx * dy1 - vy * dx1) / c;
          c2 = (vx * dy2 - vy * dx2) / c;
          if (0 < c1 && c1 < 1 && 0 < c2 && c2 < 1) {
            return true;
          }
        }
      }
    }
    return false;
  }
}
