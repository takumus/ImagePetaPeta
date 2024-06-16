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
export const secureFile = (() => {
  function toFile(
    input: string | Buffer | Readable,
    outputFilePath: string,
    key: string,
    mode: Mode,
    options: ReadStreamOptions,
    verify: boolean,
    iv = Buffer.alloc(BLOCK_SIZE, 0),
  ) {
    return new Promise<void>(async (res, rej) => {
      const output = createWriteStream(outputFilePath);
      const encoded = toStream(input, key, mode, options, iv);
      encoded.pipe(output);
      function error(err: any) {
        rej(err);
        output.destroy();
        encoded.destroy();
      }
      encoded.on("error", error);
      output.on("error", error);
      const hash = verify ? fileSHA256(getInputStream(input)) : undefined;
      async function close() {
        if (verify) {
          const newHash = fileSHA256(
            toStream(
              outputFilePath,
              key,
              mode === "decrypt" ? "encrypt" : "decrypt",
              undefined,
              iv,
            ),
          );
          if ((await hash) === (await newHash)) {
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
    iv = Buffer.alloc(BLOCK_SIZE, 0),
  ) {
    const range = {
      start: options?.startBlock !== undefined ? options.startBlock * BLOCK_SIZE : undefined,
      end: options?.endBlock !== undefined ? options.endBlock * BLOCK_SIZE - 1 : undefined,
    };
    const currentIV = iv;
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
        iv?: Buffer,
      ) => toFile(input, outputFilePath, key, mode, readStreamOptions, verify, iv),
      toStream: (
        input: string | Buffer | Readable,
        key: string,
        readStreamOptions: ReadStreamOptions = {},
        iv?: Buffer,
      ) => toStream(input, key, mode, readStreamOptions, iv),
    };
  }
  return {
    encrypt: createFunctions("encrypt"),
    decrypt: {
      ...createFunctions("decrypt"),
    },
  };
})();
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
        .toStream(
          path,
          sfp.getKey(),
          {
            startBlock: startAESBlock,
            endBlock: endAESBlock,
          },
          getIVFromID(petaFile.id),
        )
        .pipe(createCroppedStream(startByteOffset, contentLength + startByteOffset));
    } else {
      return secureFile.decrypt.toStream(path, sfp.getKey(), undefined, getIVFromID(petaFile.id));
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
export function getIVFromID(id: string) {
  const hash = createHash("sha256");
  hash.update(id);
  const iv = hash.digest().subarray(0, BLOCK_SIZE);
  return iv;
}
