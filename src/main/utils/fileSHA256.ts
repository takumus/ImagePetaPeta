import crypto from "crypto";
import { createReadStream, ReadStream } from "node:fs";
import { Readable } from "node:stream";

export function fileSHA256(filePath: string | Readable) {
  return new Promise<string>((res, rej) => {
    const stream = typeof filePath === "string" ? createReadStream(filePath) : filePath;
    const hash = crypto.createHash("sha256");
    stream.pipe(hash);
    stream.on("end", () => {
      hash.end();
      res(hash.digest("hex"));
      if (stream instanceof ReadStream) {
        stream.destroy();
      }
    });
    stream.on("error", rej);
  });
}
