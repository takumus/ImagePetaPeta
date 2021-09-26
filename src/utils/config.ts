import { readFile, writeFile } from "./asyncFile";

export default class Config<T> {
  data: T;
  constructor(private path: string, private defaultData: T) {
    this.data = JSON.parse(JSON.stringify(defaultData));
  }
  async load() {
    let buffer: Buffer | null = null;
    try {
      buffer = await readFile(this.path);
    } catch (e) {
      await this.save();
    }
    if (buffer) {
      this.data = JSON.parse(buffer.toString());
    }
  }
  async save() {
    await writeFile(this.path, Buffer.from(JSON.stringify(this.data, null, 2)));
  }
}