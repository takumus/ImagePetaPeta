type ArgType = Vec2 | {
  x: number,
  y: number
}
export class Vec2 {
  public x = 0;
  public y = 0;
  constructor(x?: number, y?: number);
  constructor(p?: ArgType);
  constructor(a: number | ArgType = 0, b = 0) {
    if (typeof a === "object") {
      this.x = a.x;
      this.y = a.y;
    } else {
      this.x = a;
      this.y = b;
    }
  }
  set(x?: number, y?: number): Vec2;
  set(p?: ArgType): Vec2;
  set(a: number | ArgType = 0, b = 0) {
    if (typeof a === "object") {
      this.x = a.x;
      this.y = a.y;
    } else {
      this.x = a;
      this.y = b;
    }
    return this;
  }
  public getLength() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }
  public getDistance(v: ArgType) {
    const dx = v.x - this.x;
    const dy = v.y - this.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
  public getDiff(v: ArgType) {
    return new Vec2(v.x - this.x, v.y - this.y);
  }
  public mult(n: number) {
    this.x *= n;
    this.y *= n;
    return this;
  }
  public div(n: number) {
    this.x /= n;
    this.y /= n;
    return this;
  }
  public normalize() {
    this.div(this.getLength());
    return this;
  }
  public clone() {
    return new Vec2(this);
  }
  public add(vec2: ArgType) {
    this.x += vec2.x;
    this.y += vec2.y;
    return this;
  }
  public sub(vec2: ArgType) {
    this.x -= vec2.x;
    this.y -= vec2.y;
    return this;
  }
  public rotate(rotation: number) {
    const r = Math.atan2(this.y, this.x) + rotation;
    const L = this.getLength();
    this.x = Math.cos(r) * L;
    this.y = Math.sin(r) * L;
    return this;
  }
  public atan2() {
    return Math.atan2(this.y, this.x);
  }
  public copyTo(vec2: ArgType) {
    vec2.x = this.x;
    vec2.y = this.y;
  }
  public copyFrom(vec2: ArgType) {
    this.x = vec2.x;
    this.y = vec2.y;
    return this;
  }
  public toJSON() {
    return {
      x: this.x,
      y: this.y
    }
  }
}
export function vec2FromMouseEvent(event: MouseEvent) {
  return new Vec2(event.clientX, event.clientY);
}