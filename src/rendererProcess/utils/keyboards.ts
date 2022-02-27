import { EventEmitter } from "eventemitter3";

export class Keyboards extends EventEmitter {
  pressedKeys: { [key: string]: boolean } = {};
  private _enabled = false;
  static id = 0;
  static locked = -1;
  private id = 0;
  constructor() {
    super();
    this.id = Keyboards.id ++;
    window.addEventListener("keydown", this.keydown);
    window.addEventListener("keyup", this.keyup);
  }
  private keydown = (event: KeyboardEvent) => {
    const key = event.key.toLowerCase();
    if (this.enabled && !this.pressedKeys[key]) {
      this.emit(key, true);
    }
    this.pressedKeys[key] = true;
  }
  private keyup = (event: KeyboardEvent) => {
    const key = event.key.toLowerCase();
    if (this.enabled && this.pressedKeys[key]) {
      this.emit(key, false);
    }
    this.pressedKeys[key] = false;
  }
  public lock() {
    Keyboards.locked = this.id;
  }
  public unlock() {
    Keyboards.locked = -1;
  }
  public destroy() {
    window.removeEventListener("keydown", this.keydown);
    window.removeEventListener("keydown", this.keyup);
  }
  public isPressed(key: string) {
    return this.pressedKeys[key];
  }
  public set enabled(value: boolean) {
    this._enabled = value;
    if (!value) {
      Object.keys(this.pressedKeys).forEach((key) => {
        if (this.pressedKeys[key]) {
          this.emit(key, false);
          this.pressedKeys[key] = false;
        }
      });
    }
  }
  public get enabled() {
    return this._enabled && (Keyboards.locked < 0 || Keyboards.locked == this.id);
  }
}