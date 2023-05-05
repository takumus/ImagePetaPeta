import crypto from "crypto";
import { createReadStream } from "fs";

export function fileSHA256(filePath: string) {
  return new Promise<string>((res, rej) => {
    const stream = createReadStream(filePath);
    const hash = crypto.createHash("sha256");
    stream.pipe(hash);
    stream.on("end", () => {
      hash.end();
      res(hash.digest("hex"));
      stream.close();
    });
    stream.on("error", rej);
  });
}
