import { createCipheriv, createDecipheriv, createHash } from "crypto";
import { createReadStream, createWriteStream } from "fs";
import { PassThrough, pipeline, Readable } from "stream";

import { bufferToStream } from "@/main/utils/bufferToStream";
import { fileSHA256 } from "@/main/utils/fileSHA256";

type Mode = "encrypt" | "decrypt";
type ReadStreamOptions = { startBlock?: number; endBlock?: number };
const BLOCK_SIZE = 16;
const ALGORITHM = "aes-256-ctr" as const;
export const secureFile = ((iv: Buffer) => {
  function toFile(
    input: string | Buffer,
    outputFilePath: string,
    key: string,
    mode: Mode,
    options: ReadStreamOptions,
    verify: boolean,
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
      output.on("close", async () => {
        if (verify) {
          if (
            (await fileSHA256(typeof input === "string" ? input : bufferToStream(input))) ===
            (await fileSHA256(
              toStream(outputFilePath, key, mode === "decrypt" ? "encrypt" : "decrypt"),
            ))
          ) {
            res();
          } else {
            rej("failed");
          }
        } else {
          res();
        }
      });
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
      typeof input === "string" ? createReadStream(input, range) : bufferToStream(input);
    const decipher = (mode === "encrypt" ? createCipheriv : createDecipheriv)(
      ALGORITHM,
      key,
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
        readStreamOptions: ReadStreamOptions = {},
        verify = true,
      ) => toFile(input, outputFilePath, key, mode, readStreamOptions, verify),
      toStream: (input: string | Buffer, key: string, readStreamOptions: ReadStreamOptions = {}) =>
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
export function passwordToKey(value: string) {
  return createHash("sha256").update(value).digest("base64").substring(0, 32);
}
