import { safeStorage } from "electron";

import Config from "@/main/libs/config";
import { passwordToKey } from "@/main/utils/secureFile";

export class ConfigSecureFilePassword extends Config<string> {
  private key: string | undefined;
  setValue(value: string) {
    const key = passwordToKey(value);
    this.data = safeStorage.encryptString(key).toString("base64");
    this.key = key;
    this.save();
  }
  getValue() {
    if (this.key === undefined) {
      this.key = safeStorage.decryptString(Buffer.from(this.data, "base64"));
    }
    return this.key;
  }
}
