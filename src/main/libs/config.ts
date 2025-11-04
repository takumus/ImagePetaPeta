import fs from "node:fs";
import deepcopy from "lodash.clonedeep";

import { SyncMigrater } from "@/main/libs/createMigrater";

export default class Config<T> {
  data: T;
  constructor(
    private path: string,
    private defaultData: T,
    migrater?: SyncMigrater<T>,
    private saveDefault = true,
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
      if (this.saveDefault) {
        this.save();
      }
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
