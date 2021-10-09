import fs from "fs";

export default class Config<T> {
  data: T;
  constructor(private path: string, private defaultData: T) {
    this.data = JSON.parse(JSON.stringify(defaultData));
  }
  load() {
    let buffer: Buffer | null = null;
    try {
      buffer = fs.readFileSync(this.path);
    } catch (e) {
      this.save();
    }
    if (buffer) {
      this.data = JSON.parse(buffer.toString());
    }
  }
  save() {
    fs.writeFileSync(this.path, Buffer.from(JSON.stringify(this.data, null, 2)));
  }
}