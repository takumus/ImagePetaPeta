import { createCipheriv, createDecipheriv, createHash } from "crypto";
import { closeSync, createReadStream, createWriteStream, openSync, readSync } from "fs";
import { stat } from "fs/promises";
import { PassThrough, pipeline, Readable } from "stream";

type Mode = "encrypt" | "decrypt";
type ReadStreamOptions = { startBlock?: number; endBlock?: number };
const BLOCK_SIZE = 16;
export const secureFile = ((iv: Buffer) => {
  const ALGORITHM = "aes-256-ctr" as const;
  function getKey(key: string) {
    // 192bitのキー
    return createHash("sha256").update(key).digest("base64").substring(0, 32);
  }
  function toFile(
    input: string | Buffer,
    outputFilePath: string,
    key: string,
    mode: Mode,
    options?: ReadStreamOptions,
  ) {
    return new Promise<void>((res, rej) => {
      const output = createWriteStream(outputFilePath);
      const encoded = toStream(input, key, mode, options);
      encoded.pipe(output);
      function error(err: any) {
        rej(err);
        output.destroy();
        encoded.destroy();
      }
      encoded.on("error", error);
      output.on("error", error);
      output.on("close", res);
    });
  }

  function toStream(input: string | Buffer, key: string, mode: Mode, options?: ReadStreamOptions) {
    const range = {
      start: options?.startBlock !== undefined ? options.startBlock * BLOCK_SIZE : undefined,
      end: options?.endBlock !== undefined ? options.endBlock * BLOCK_SIZE - 1 : undefined,
    };
    const currentIV = Buffer.from(iv);
    currentIV.writeIntBE(options?.startBlock ?? 0, currentIV.length - 4, 4);
    const inputStream =
      typeof input === "string"
        ? createReadStream(input, range)
        : new Readable({
            read() {
              this.push(input);
              this.push(null);
            },
          });
    const decipher = (mode === "encrypt" ? createCipheriv : createDecipheriv)(
      ALGORITHM,
      getKey(key),
      currentIV,
    );
    const transformed = new PassThrough();
    pipeline(inputStream, decipher, transformed, (err) => {
      if (!err) return;
      // inputStream.destroy();
      // transformed.destroy();
      // decipher.destroy();
    });
    return transformed;
  }
  function createFunctions(mode: Mode) {
    return {
      toFile: (
        input: string | Buffer,
        outputFilePath: string,
        key: string,
        readStreamOptions?: ReadStreamOptions,
      ) => toFile(input, outputFilePath, key, mode, readStreamOptions),
      toStream: (input: string | Buffer, key: string, readStreamOptions?: ReadStreamOptions) =>
        toStream(input, key, mode, readStreamOptions),
    };
  }
  return {
    encrypt: createFunctions("encrypt"),
    decrypt: {
      ...createFunctions("decrypt"),
    },
  };
})(Buffer.alloc(BLOCK_SIZE, 0));
