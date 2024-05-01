import { createCipheriv, createDecipheriv, createHash } from "crypto";
import { createReadStream, createWriteStream } from "fs";
import { PassThrough, pipeline } from "stream";

type Mode = "encrypt" | "decrypt";
export const secureFile = ((iv: Buffer) => {
  const ALGORITHM = "aes-192-cbc" as const;
  function getKey(key: string) {
    // 192bitのキー
    return createHash("sha256").update(key).digest("base64").substring(0, 24);
  }
  function asFile(inputFilePath: string, outputFilePath: string, key: string, mode: Mode) {
    return new Promise<void>((res, rej) => {
      const output = createWriteStream(outputFilePath);
      const encoded = asFileStream(inputFilePath, key, mode);
      encoded.pipe(output);
      function error(err: any) {
        rej(err);
        output.destroy();
        encoded.destroy();
      }
      encoded.on("error", error);
      output.on("error", error);
      encoded.on("end", res);
    });
  }
  function asFileStream(inputFilePath: string, key: string, mode: Mode) {
    const decipher = (mode === "encrypt" ? createCipheriv : createDecipheriv)(
      ALGORITHM,
      getKey(key),
      iv,
    );
    const input = createReadStream(inputFilePath);
    const transformed = new PassThrough();
    function error(err: any) {
      transformed.emit("error", err);
      input.destroy();
    }
    pipeline(input, decipher, transformed, (err) => (err ? error(err) : undefined));
    decipher.on("error", error);
    return transformed;
  }
  function createFunctions(mode: Mode) {
    return {
      asFile: (inputFilePath: string, outputFilePath: string, key: string) =>
        asFile(inputFilePath, outputFilePath, key, mode),
      asStream: (inputFilePath: string, key: string) => asFileStream(inputFilePath, key, mode),
    };
  }
  return {
    encrypt: createFunctions("encrypt"),
    decrypt: createFunctions("decrypt"),
  };
})(Buffer.alloc(16, 0));
