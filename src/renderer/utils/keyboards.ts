export class Keyboards {
  private _enabled = false;
  private id = 0;
  private downListeners: { [key: string]: Set<KeyboardsCallback> };
  private upListeners: { [key: string]: Set<KeyboardsCallback> };
  constructor(public lockable = true) {
    this.id = Keyboards.id++;
    this.downListeners = {};
    this.upListeners = {};
    Keyboards.init();
    Keyboards.add(this);
  }
  private keydown = (key: Keys, event?: KeyboardEvent) => {
    if (this.enabled) {
      this.emit(key, true, event);
    }
  };
  private keyup = (key: Keys, event?: KeyboardEvent) => {
    if (this.enabled) {
      this.emit(key, false, event);
    }
  };
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
  public keys(...keys: Keys[]) {
    const handler = {
      down: (callback: KeyboardsCallback) => {
        keys.forEach((key) => {
          (this.downListeners[key] || (this.downListeners[key] = new Set())).add(callback);
        });
        return handler;
      },
      up: (callback: KeyboardsCallback) => {
        keys.forEach((key) => {
          (this.upListeners[key] || (this.upListeners[key] = new Set())).add(callback);
        });
        return handler;
      },
      change: (callback: KeyboardsCallback) => {
        handler.down(callback);
        handler.up(callback);
        return handler;
      },
    };
    return handler;
  }
  private emit(key: Keys, pressed: boolean, event?: KeyboardEvent) {
    (pressed ? this.downListeners : this.upListeners)[key]?.forEach((callback) => {
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
    return (
      this._enabled && (Keyboards.locked < 0 || Keyboards.locked === this.id || !this.lockable)
    );
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
        const key = event.code as Keys;
        keyboards.keydown(key, event);
        Keyboards.pressedKeys[key] = true;
      });
    });
    window.addEventListener("keyup", (event) => {
      Keyboards.listeners.forEach((keyboards) => {
        const key = event.code as Keys;
        keyboards.keyup(key, event);
        Keyboards.pressedKeys[key] = false;
      });
    });
    window.addEventListener("blur", () => {
      Object.keys(Keyboards.pressedKeys)
        .filter((key) => {
          return Keyboards.pressedKeys[key];
        })
        .forEach((key) => {
          Keyboards.listeners.forEach((keyboards) => {
            keyboards.keyup(key as Keys);
          });
          Keyboards.pressedKeys[key] = false;
        });
    });
  }
  static add(keyboards: Keyboards) {
    if (!Keyboards.listeners.has(keyboards)) {
      Keyboards.listeners.add(keyboards);
    }
  }
  static remove(keyboards: Keyboards) {
    Keyboards.listeners.delete(keyboards);
  }
  public static pressedOR(...keys: Keys[]) {
    for (let i = 0; i < keys.length; i++) {
      if (Keyboards.pressed(keys[i])) {
        return true;
      }
    }
    return false;
  }
  public static pressedAND(...keys: Keys[]) {
    for (let i = 0; i < keys.length; i++) {
      if (!Keyboards.pressed(keys[i])) {
        return false;
      }
    }
    return true;
  }
  public static pressed(key?: Keys) {
    if (key === undefined) {
      return false;
    }
    return Keyboards.pressedKeys[key] ? true : false;
  }
}
type KeyboardsCallback = (pressed: boolean, event?: KeyboardEvent) => void;
export type Keys =
  | "Backspace"
  | "Tab"
  | "Enter"
  | "ShiftLeft"
  | "ShiftRight"
  | "ControlLeft"
  | "ControlRight"
  | "AltLeft"
  | "AltRight"
  | "Pause"
  | "CapsLock"
  | "Escape"
  | "Space"
  | "PageUp"
  | "PageDown"
  | "End"
  | "Home"
  | "ArrowLeft"
  | "ArrowUp"
  | "ArrowRight"
  | "ArrowDown"
  | "PrintScreen"
  | "Insert"
  | "Delete"
  | "Digit0"
  | "Digit1"
  | "Digit2"
  | "Digit3"
  | "Digit4"
  | "Digit5"
  | "Digit6"
  | "Digit7"
  | "Digit8"
  | "Digit9"
  | "KeyA"
  | "KeyB"
  | "KeyC"
  | "KeyD"
  | "KeyE"
  | "KeyF"
  | "KeyG"
  | "KeyH"
  | "KeyI"
  | "KeyJ"
  | "KeyK"
  | "KeyL"
  | "KeyM"
  | "KeyN"
  | "KeyO"
  | "KeyP"
  | "KeyQ"
  | "KeyR"
  | "KeyS"
  | "KeyT"
  | "KeyU"
  | "KeyV"
  | "KeyW"
  | "KeyX"
  | "KeyY"
  | "KeyZ"
  | "MetaLeft"
  | "MetaRight"
  | "ContextMenu"
  | "Numpad0"
  | "Numpad1"
  | "Numpad2"
  | "Numpad3"
  | "Numpad4"
  | "Numpad5"
  | "Numpad6"
  | "Numpad7"
  | "Numpad8"
  | "Numpad9"
  | "NumpadMultiply"
  | "NumpadAdd"
  | "NumpadSubtract"
  | "NumpadDecimal"
  | "NumpadDivide"
  | "F1"
  | "F2"
  | "F3"
  | "F4"
  | "F5"
  | "F6"
  | "F7"
  | "F8"
  | "F9"
  | "F10"
  | "F11"
  | "F12"
  | "NumLock"
  | "ScrollLock"
  | "Semicolon"
  | "Equal"
  | "Comma"
  | "Minus"
  | "Period"
  | "Slash"
  | "Backquote"
  | "BracketLeft"
  | "Backslash"
  | "BracketRight"
  | "Quote";
