import { safeStorage } from "electron";

import { TypedEventEmitter } from "@/commons/utils/typedEventEmitter";

import Config from "@/main/libs/config";
import { passwordToKey } from "@/main/utils/secureFile";

export class ConfigSecureFilePassword extends Config<string> {
  private key: string | undefined;
  private _data: string = "";
  public readonly events = new TypedEventEmitter<{
    change: (value: string) => void;
  }>();
  setValue(value: string) {
    const key = passwordToKey(value);
    this._data = safeStorage.encryptString(key).toString("base64");
    this.key = key;
    this.save();
    this.events.emit("change", value);
  }
  getValue() {
    if (this.key === undefined) {
      this.key = safeStorage.decryptString(Buffer.from(this._data, "base64"));
    }
    return this.key;
  }
}
