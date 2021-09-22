export class Vec2 {
  constructor(public x: number = 0, public y: number = 0) {
    
  }
  public toJSON() {
    return {
      x: this.x,
      y: this.y
    }
  }
  public getLength() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }
  public getDistance(v: Vec2) {
    return this.getDiff(v).getLength();
  }
  public getDiff(v: Vec2) {
    return new Vec2(v.x - this.x, v.y - this.y);
  }
  public mult(n: number) {
    this.x *= n;
    this.y *= n;
    return this;
  }
  public normalize() {
    const l = this.getLength();
    this.x /= l;
    this.y /= l;
    return this;
  }
  public clone() {
    return new Vec2(this.x, this.y);
  }
  public add(vec2: Vec2) {
    this.x += vec2.x;
    this.y += vec2.y;
    return this;
  }
  public rotate(rotation: number) {
    const r = Math.atan2(this.y, this.x);
    const L = this.getLength();
    this.x = Math.cos(r + rotation) * L;
    this.y = Math.sin(r + rotation) * L;
    return this;
  }
}
export function vec2FromObject(position: {x: number, y: number}) {
  return new Vec2(position.x, position.y);
}
export function vec2FromMouseEvent(event: MouseEvent) {
  return new Vec2(event.clientX, event.clientY);
}