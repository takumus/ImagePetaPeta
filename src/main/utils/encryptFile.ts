import { createCipheriv, createDecipheriv, createHash } from "crypto";
import { createReadStream, createWriteStream } from "fs";
import { PassThrough, pipeline } from "stream";

type Mode = "encrypt" | "decrypt";
type ReadStreamOptions = Parameters<typeof createReadStream>[1];
export const secureFile = ((iv: Buffer) => {
  const ALGORITHM = "aes-192-cbc" as const;
  function getKey(key: string) {
    // 192bitのキー
    return createHash("sha256").update(key).digest("base64").substring(0, 24);
  }
  function asFile(
    inputFilePath: string,
    outputFilePath: string,
    key: string,
    mode: Mode,
    options?: ReadStreamOptions,
  ) {
    return new Promise<void>((res, rej) => {
      const output = createWriteStream(outputFilePath);
      const encoded = asStream(inputFilePath, key, mode, options);
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
  function asStream(inputFilePath: string, key: string, mode: Mode, options?: ReadStreamOptions) {
    const decipher = (mode === "encrypt" ? createCipheriv : createDecipheriv)(
      ALGORITHM,
      getKey(key),
      iv,
    );
    const input = createReadStream(inputFilePath, options);
    const transformed = new PassThrough();
    pipeline(input, decipher, transformed, (err) => {
      if (!err) return;
      input.destroy();
      transformed.destroy();
      decipher.destroy();
    });
    return transformed;
  }
  function createFunctions(mode: Mode) {
    return {
      asFile: (
        inputFilePath: string,
        outputFilePath: string,
        key: string,
        readStreamOptions?: ReadStreamOptions,
      ) => asFile(inputFilePath, outputFilePath, key, mode, readStreamOptions),
      asStream: (inputFilePath: string, key: string, readStreamOptions?: ReadStreamOptions) =>
        asStream(inputFilePath, key, mode, readStreamOptions),
    };
  }
  return {
    encrypt: createFunctions("encrypt"),
    decrypt: createFunctions("decrypt"),
  };
})(Buffer.alloc(16, 0));
