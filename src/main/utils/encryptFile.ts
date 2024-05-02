import { createCipheriv, createDecipheriv, createHash } from "crypto";
import { closeSync, createReadStream, createWriteStream, openSync, readSync } from "fs";
import { stat } from "fs/promises";
import { PassThrough, pipeline, Readable } from "stream";

type Mode = "encrypt" | "decrypt";
type ReadStreamOptions = { startBlock: number };
const BLOCK_SIZE = 16;
export const secureFile = ((iv: Buffer) => {
  const ALGORITHM = "aes-192-cbc" as const;
  function getKey(key: string) {
    // 192bitのキー
    return createHash("sha256").update(key).digest("base64").substring(0, 24);
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
        if (err.code === "ERR_OSSL_WRONG_FINAL_BLOCK_LENGTH") {
          res();
        } else {
          rej(err);
          output.destroy();
          encoded.destroy();
        }
      }
      encoded.on("error", error);
      output.on("error", error);
      encoded.on("end", res);
    });
  }
  async function getFileSize(input: string | Buffer, key: string) {
    const inputSize = typeof input === "string" ? (await stat(input)).size : input.length;
    const ivIndex = (Math.floor(inputSize / BLOCK_SIZE) - 2) * BLOCK_SIZE;
    const lastIndex = (Math.floor(inputSize / BLOCK_SIZE) - 1) * BLOCK_SIZE;
    const res = await (async (): Promise<{ ivBuffer: Buffer; lastBuffer: Buffer }> => {
      if (typeof input === "string") {
        const ivBuffer = Buffer.alloc(BLOCK_SIZE);
        const lastBuffer = Buffer.alloc(BLOCK_SIZE);
        const fd = openSync(input, "r");
        readSync(fd, ivBuffer, {
          position: ivIndex,
          length: BLOCK_SIZE,
        });
        readSync(fd, lastBuffer, {
          position: lastIndex,
          length: BLOCK_SIZE,
        });
        closeSync(fd);
        return {
          ivBuffer,
          lastBuffer,
        };
      } else {
        const ivBuffer = input.subarray(ivIndex, ivIndex + BLOCK_SIZE);
        const lastBuffer = input.subarray(lastIndex, lastIndex + BLOCK_SIZE);
        return {
          ivBuffer,
          lastBuffer,
        };
      }
    })();
    const cipher = createDecipheriv(ALGORITHM, getKey(key), res.ivBuffer);
    cipher.update(res.lastBuffer);
    const size = cipher.final().length + inputSize - BLOCK_SIZE;
    return {
      enc: inputSize,
      dec: size,
    };
  }
  function toStream(input: string | Buffer, key: string, mode: Mode, options?: ReadStreamOptions) {
    let currentIV = iv;
    let range: { start: number; end?: number } | undefined;
    if (options !== undefined) {
      range = {
        start: options.startBlock * BLOCK_SIZE,
      };
      if (typeof input === "string" && options.startBlock > 0) {
        const ivBuffer = Buffer.alloc(BLOCK_SIZE);
        readSync(openSync(input, "r"), ivBuffer, {
          position: (options.startBlock - 1) * BLOCK_SIZE,
          length: BLOCK_SIZE,
        });
        currentIV = ivBuffer;
      }
    }
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
      getFileSize,
    },
  };
})(Buffer.alloc(BLOCK_SIZE, 0));
