import { safeStorage } from "electron";

import { SecureFilePassword } from "@/commons/datas/secureFilePassword";
import { TypedEventEmitter } from "@/commons/utils/typedEventEmitter";

import Config from "@/main/libs/config";
import { usePaths } from "@/main/provides/utils/paths";
import { passwordToKey } from "@/main/utils/passwordToKey";

// import { passwordToKey } from "@/main/utils/secureFile";

export class ConfigSecureFilePassword extends Config<SecureFilePassword> {
  private key: string | undefined;
  // private _data: string = "";
  public readonly events = new TypedEventEmitter<{
    change: (value: string) => void;
  }>();
  async setPassword(password: string, save = false) {
    this.key = await passwordToKey(password);
    this.setKey(this.key, save);
  }
  setKey(key: string, save = false) {
    this.key = key;
    if (save) {
      try {
        this.data[usePaths().DIR_ROOT] = safeStorage.encryptString(this.key).toString("base64");
        this.save();
      } catch {
        //
      }
    }
    this.events.emit("change", this.key);
  }
  getKey() {
    if (this.key !== undefined) {
      return this.key;
    }
    const encryptedKey = this.data[usePaths().DIR_ROOT];
    if (encryptedKey !== undefined) {
      try {
        this.key = safeStorage.decryptString(Buffer.from(encryptedKey, "base64"));
        return this.key;
      } catch {
        //
      }
    }
    throw new Error("Password is not set");
  }
}
