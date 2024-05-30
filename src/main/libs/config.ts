import fs from "node:fs";
import deepcopy from "deepcopy";

import { SyncMigrater } from "@/main/libs/createMigrater";

export default class Config<T> {
  data: T;
  constructor(
    private path: string,
    private defaultData: T,
    migrater?: SyncMigrater<T>,
  ) {
    this.data = deepcopy(defaultData);
    this.load();
    if (migrater) {
      const result = migrater(this.data);
      this.data = result.data;
      if (result.updated) {
        this.save();
      }
    }
  }
  load() {
    try {
      const buffer = fs.readFileSync(this.path);
      this.data = JSON.parse(buffer.toString());
    } catch (e) {
      this.data = deepcopy(this.defaultData);
    }
  }
  save() {
    try {
      fs.writeFileSync(this.path, Buffer.from(JSON.stringify(this.data, null, 2)));
    } catch (error) {
      throw "Could not save settings.json " + error;
    }
  }
}
