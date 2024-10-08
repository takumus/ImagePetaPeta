import { Readable } from "node:stream";

export function bufferToStream(buffer: Uint8Array) {
  return new Readable({
    read() {
      this.push(buffer);
      this.push(null);
    },
  });
}
