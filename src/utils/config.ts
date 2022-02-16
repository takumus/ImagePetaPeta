import deepcopy from "deepcopy";
import fs from "fs";

export default class Config<T> {
  data: T;
  constructor(private path: string, private defaultData: T) {
    this.data = deepcopy(defaultData);
    this.load();
  }
  load() {
    let buffer: Buffer | null = null;
    try {
      buffer = fs.readFileSync(this.path);
    } catch (e) {
      this.save();
    }
    try {
      if (buffer) {
        this.data = JSON.parse(buffer.toString());
      }
    } catch(e) {
      this.data = deepcopy(this.defaultData);
      this.save();
    }
  }
  save() {
    fs.writeFileSync(this.path, Buffer.from(JSON.stringify(this.data, null, 2)));
  }
}