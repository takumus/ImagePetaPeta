//
// https://github.com/wise9/enchant.js/blob/master/dev/src/Entity.js

import { Vec2 } from "./vec2";

//
type Pos = [number, number];
interface Rect {
  leftTop: Vec2,
  rightTop: Vec2,
  leftBottom: Vec2,
  rightBottom: Vec2,
}
export function hitTest (rect1: Rect, rect2: Rect) {
  const lt1 = rect1.leftTop.toArray(),
    rt1 = rect1.rightTop.toArray(),
    lb1 = rect1.leftBottom.toArray(),
    rb1 = rect1.rightBottom.toArray(),
    lt2 = rect2.leftTop.toArray(), 
    rt2 = rect2.rightTop.toArray(),
    lb2 = rect2.leftBottom.toArray(), 
    rb2 = rect2.rightBottom.toArray(),
    ltx1 = lt1[0], lty1 = lt1[1], rtx1 = rt1[0], rty1 = rt1[1],
    lbx1 = lb1[0], lby1 = lb1[1], rbx1 = rb1[0], rby1 = rb1[1],
    ltx2 = lt2[0], lty2 = lt2[1], rtx2 = rt2[0], rty2 = rt2[1],
    lbx2 = lb2[0], lby2 = lb2[1], rbx2 = rb2[0], rby2 = rb2[1],
    t1 = [ rtx1 - ltx1, rty1 - lty1 ],
    r1 = [ rbx1 - rtx1, rby1 - rty1 ],
    b1 = [ lbx1 - rbx1, lby1 - rby1 ],
    l1 = [ ltx1 - lbx1, lty1 - lby1 ],
    t2 = [ rtx2 - ltx2, rty2 - lty2 ],
    r2 = [ rbx2 - rtx2, rby2 - rty2 ],
    b2 = [ lbx2 - rbx2, lby2 - rby2 ],
    l2 = [ ltx2 - lbx2, lty2 - lby2 ],
    cx1 = (ltx1 + rtx1 + lbx1 + rbx1) >> 2,
    cy1 = (lty1 + rty1 + lby1 + rby1) >> 2,
    cx2 = (ltx2 + rtx2 + lbx2 + rbx2) >> 2,
    cy2 = (lty2 + rty2 + lby2 + rby2) >> 2;
  let i: number,
    j: number,
    poss1: Pos[],
    poss2: Pos[],
    dirs1: number[][],
    dirs2: number[][],
    pos1: Pos,
    pos2: Pos,
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
  if (t1[0] * (cy2 - lty1) - t1[1] * (cx2 - ltx1) > 0 &&
    r1[0] * (cy2 - rty1) - r1[1] * (cx2 - rtx1) > 0 &&
    b1[0] * (cy2 - rby1) - b1[1] * (cx2 - rbx1) > 0 &&
    l1[0] * (cy2 - lby1) - l1[1] * (cx2 - lbx1) > 0) {
    return true;
  } else if (t2[0] * (cy1 - lty2) - t2[1] * (cx1 - ltx2) > 0 &&
    r2[0] * (cy1 - rty2) - r2[1] * (cx1 - rtx2) > 0 &&
    b2[0] * (cy1 - rby2) - b2[1] * (cx1 - rbx2) > 0 &&
    l2[0] * (cy1 - lby2) - l2[1] * (cx1 - lbx2) > 0) {
    return true;
  } else {
    poss1 = [ lt1, rt1, rb1, lb1 ];
    poss2 = [ lt2, rt2, rb2, lb2 ];
    dirs1 = [ t1, r1, b1, l1 ];
    dirs2 = [ t2, r2, b2, l2 ];
    for (i = 0; i < 4; i++) {
      pos1 = poss1[i];
      px1 = pos1[0]; py1 = pos1[1];
      dir1 = dirs1[i];
      dx1 = dir1[0]; dy1 = dir1[1];
      for (j = 0; j < 4; j++) {
        pos2 = poss2[j];
        px2 = pos2[0]; py2 = pos2[1];
        dir2 = dirs2[j];
        dx2 = dir2[0]; dy2 = dir2[1];
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