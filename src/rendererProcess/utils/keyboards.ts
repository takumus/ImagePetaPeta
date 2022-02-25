import { EventEmitter } from "eventemitter3";

export class Keyboards extends EventEmitter {
  pressedKeys: { [key: string]: boolean } = {};
  private _enabled = false;
  constructor() {
    super();
    window.addEventListener("keydown", this.keydown);
    window.addEventListener("keyup", this.keyup);
  }
  private keydown = (event: KeyboardEvent) => {
    const key = event.key.toLowerCase();
    if (this._enabled && !this.pressedKeys[key]) {
      this.emit(key, true);
    }
    this.pressedKeys[key] = true;
  }
  private keyup = (event: KeyboardEvent) => {
    const key = event.key.toLowerCase();
    if (this._enabled && this.pressedKeys[key]) {
      this.emit(key, false);
    }
    this.pressedKeys[key] = false;
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
          this.emit("up", key);
          this.pressedKeys[key] = false;
        }
      });
    }
  }
  public get enabled() {
    return this._enabled;
  }
}