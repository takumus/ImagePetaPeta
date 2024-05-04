import { safeStorage } from "electron";

import Config from "@/main/libs/config";

export class ConfigSecureFilePassword extends Config<string> {
  private password: string | undefined;
  setValue(value: string) {
    this.data = safeStorage.encryptString(value).toString("base64");
    this.password = value;
    this.save();
  }
  getValue() {
    if (this.password === undefined) {
      this.password = safeStorage.decryptString(Buffer.from(this.data, "base64"));
    }
    return this.password;
  }
}
