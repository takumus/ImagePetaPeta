export class Keyboards {
  private _enabled = false;
  private id = 0;
  private downListeners: { [key: string]: Set<KeyboardsCallback> };
  private upListeners: { [key: string]: Set<KeyboardsCallback> };
  constructor(public lockable = true) {
    this.id = Keyboards.id ++;
    this.downListeners = {};
    this.upListeners = {};
    Keyboards.init();
    Keyboards.add(this);
  }
  private keydown = (key: string, event?: KeyboardEvent) => {
    if (this.enabled) {
      this.emit(key, true, event);
    }
  }
  private keyup = (key: string, event?: KeyboardEvent) => {
    if (this.enabled) {
      this.emit(key, false, event);
    }
  }
  public lock() {
    Keyboards.locked = this.id;
  }
  public unlock() {
    Keyboards.locked = -1;
  }
  public destroy() {
    this.unlock();
    Keyboards.remove(this);
    this.downListeners = {};
    this.upListeners = {};
  }
  public down(keys: string[], callback: KeyboardsCallback) {
    keys.forEach((key) => {
      (this.downListeners[key] || (this.downListeners[key] = new Set())).add(callback);
    });
  }
  public up(keys: string[], callback: KeyboardsCallback) {
    keys.forEach((key) => {
      (this.upListeners[key] || (this.upListeners[key] = new Set())).add(callback);
    });
  }
  public change(keys: string[], callback: KeyboardsCallback) {
    this.down(keys, callback);
    this.up(keys, callback);
  }
  private emit(key: string, pressed: boolean, event?: KeyboardEvent) {
    (pressed ? this.downListeners : this.upListeners)[key]
    ?.forEach((callback) => {
      callback(pressed, event);
    });
  }
  public set enabled(value: boolean) {
    this._enabled = value;
    if (!value) {
      this.unlock();
    }
  }
  public get enabled() {
    return this._enabled && (Keyboards.locked < 0 || Keyboards.locked === this.id || !this.lockable);
  }

  // statics
  static listeners = new Set<Keyboards>();
  static inited = false;
  static locked = -1;
  static id = 0;
  static pressedKeys: { [key: string]: boolean } = {};
  static init() {
    if (Keyboards.inited) {
      return;
    }
    Keyboards.inited = true;
    window.addEventListener("keydown", (event) => {
      Keyboards.listeners.forEach((keyboards) => {
        const key = event.key.toLowerCase();
        keyboards.keydown(key, event);
        Keyboards.pressedKeys[key] = true;
      });
    });
    window.addEventListener("keyup", (event) => {
      Keyboards.listeners.forEach((keyboards) => {
        const key = event.key.toLowerCase();
        keyboards.keyup(key, event);
        Keyboards.pressedKeys[key] = false;
      });
    });
    window.addEventListener("blur", () => {
      Object.keys(Keyboards.pressedKeys).filter((key) => {
        return Keyboards.pressedKeys[key];
      }).forEach((key) => {
        Keyboards.listeners.forEach((keyboards) => {
          keyboards.keyup(key);
        });
        Keyboards.pressedKeys[key] = false;
      });
    })
  }
  static add(keyboards: Keyboards) {
    if (!Keyboards.listeners.has(keyboards)) {
      Keyboards.listeners.add(keyboards);
    }
  }
  static remove(keyboards: Keyboards) {
    Keyboards.listeners.delete(keyboards);
  }
  public static pressedOR(...keys: string[]) {
    for (let i = 0; i < keys.length; i++) {
      if (Keyboards.pressed(keys[i]!)) {
        return true;
      }
    }
    return false;
  }
  public static pressedAND(...keys: string[]) {
    for (let i = 0; i < keys.length; i++) {
      if (!Keyboards.pressed(keys[i]!)) {
        return false;
      }
    }
    return true;
  }
  public static pressed(key: string) {
    return Keyboards.pressedKeys[key] ? true : false;
  }
}
type KeyboardsCallback = (pressed: boolean, event?: KeyboardEvent) => void;