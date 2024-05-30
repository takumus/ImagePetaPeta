import { createCipheriv, createDecipheriv, createHash } from "crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { PassThrough, pipeline, Readable, Transform } from "node:stream";

import { PetaFile } from "@/commons/datas/petaFile";

import { useConfigSecureFilePassword } from "@/main/provides/configs";
import { bufferToStream } from "@/main/utils/bufferToStream";
import { fileSHA256 } from "@/main/utils/fileSHA256";
import { getPetaFilePath } from "@/main/utils/getPetaFileDirectory";

type Mode = "encrypt" | "decrypt";
type ReadStreamOptions = { startBlock?: number; endBlock?: number };
const BLOCK_SIZE = 16;
const ALGORITHM = "aes-256-ctr" as const;
export const secureFile = ((iv: Buffer) => {
  function toFile(
    input: string | Buffer | Readable,
    outputFilePath: string,
    key: string,
    mode: Mode,
    options: ReadStreamOptions,
    verify: boolean,
  ) {
    return new Promise<void>(async (res, rej) => {
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
      const hash = verify
        ? await new Promise((res) => {
            const hash = createHash("sha256");
            const stream = getInputStream(input);
            stream.pipe(hash);
            stream.on("end", () => {
              hash.end();
              res(hash.digest("hex"));
            });
          })
        : undefined;
      async function close() {
        if (verify) {
          if (
            hash ===
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
      }
      if (output.closed) {
        close();
        return;
      }
      output.on("close", close);
    });
  }
  function toStream(
    input: string | Buffer | Readable,
    key: string,
    mode: Mode,
    options?: ReadStreamOptions,
  ) {
    const range = {
      start: options?.startBlock !== undefined ? options.startBlock * BLOCK_SIZE : undefined,
      end: options?.endBlock !== undefined ? options.endBlock * BLOCK_SIZE - 1 : undefined,
    };
    const currentIV = Buffer.from(iv);
    currentIV.writeIntBE(options?.startBlock ?? 0, currentIV.length - 4, 4);
    const inputStream = getInputStream(input, range);
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
        input: string | Buffer | Readable,
        outputFilePath: string,
        key: string,
        readStreamOptions: ReadStreamOptions = {},
        verify = true,
      ) => toFile(input, outputFilePath, key, mode, readStreamOptions, verify),
      toStream: (
        input: string | Buffer | Readable,
        key: string,
        readStreamOptions: ReadStreamOptions = {},
      ) => toStream(input, key, mode, readStreamOptions),
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
export function getStreamFromPetaFile(
  petaFile: PetaFile,
  type: "original" | "thumbnail",
  options?: { start: number; end: number },
) {
  const path = getPetaFilePath.fromPetaFile(petaFile)[type];
  if (petaFile.encrypted) {
    const sfp = useConfigSecureFilePassword();
    if (options) {
      const contentLength = options.end - options.start;
      const [startAESBlock, endAESBlock] = [
        Math.floor(options.start / 16),
        Math.ceil(options.end / 16) + 1,
      ];
      const [startAESByte, _endAESByte] = [startAESBlock * 16, endAESBlock * 16];
      const startByteOffset = options.start - startAESByte;
      return secureFile.decrypt
        .toStream(path, sfp.getValue(), {
          startBlock: startAESBlock,
          endBlock: endAESBlock,
        })
        .pipe(createCroppedStream(startByteOffset, contentLength + startByteOffset));
    } else {
      return secureFile.decrypt.toStream(path, sfp.getValue());
    }
  } else {
    return createReadStream(path, options);
  }
}
function getInputStream(
  input: string | Uint8Array | Readable,
  range?: { start?: number; end?: number },
) {
  return typeof input === "string"
    ? createReadStream(input, range)
    : input instanceof Buffer || input instanceof Uint8Array
      ? bufferToStream(input)
      : input;
}
function createCroppedStream(start: number, end: number) {
  let currentIndex = 0;
  const _end = end + 1;
  return new Transform({
    transform(chunk, _encoding, callback) {
      if (currentIndex < _end) {
        const startOffset = Math.max(start - currentIndex, 0);
        const endOffset = Math.min(chunk.length, _end - currentIndex);
        const relevantData = chunk.slice(startOffset, endOffset);
        currentIndex += chunk.length;
        this.push(relevantData);
      }
      callback();
    },
  });
}
