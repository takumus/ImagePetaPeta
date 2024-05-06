import crypto from "crypto";
import { createReadStream, ReadStream } from "fs";
import { Readable } from "stream";

export function fileSHA256(filePath: string | Readable) {
  return new Promise<string>((res, rej) => {
    const stream = typeof filePath === "string" ? createReadStream(filePath) : filePath;
    const hash = crypto.createHash("sha256");
    stream.pipe(hash);
    stream.on("end", () => {
      hash.end();
      res(hash.digest("hex"));
      if (stream instanceof ReadStream) {
        stream.close();
      }
    });
    stream.on("error", rej);
  });
}
