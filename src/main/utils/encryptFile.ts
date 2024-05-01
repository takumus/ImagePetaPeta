import { createCipheriv, createDecipheriv, createHash } from "crypto";
import { createReadStream, createWriteStream } from "fs";
import { PassThrough, pipeline, Readable } from "stream";
import { promisify } from "util";

const algorithm = "aes-192-cbc" as const;
const iv = Buffer.alloc(16, 0);
function getKey(key: string) {
  return createHash("sha256").update(key).digest("base64").substring(0, 24);
}
export const encryptFile = (inputFilePath: string, outputFilePath: string, key: string) => {
  return new Promise<void>((res, rej) => {
    const output = createWriteStream(outputFilePath);
    const input = createEncryptFileStream(inputFilePath, key);
    input.pipe(output);
    input.on("error", (err) => {
      rej();
      output.destroy(err);
      output.end();
    });
    output.on("error", (err) => {
      rej();
    });
    input.on("end", () => {
      res();
    });
  });
};
export const decryptFile = (inputFilePath: string, outputFilePath: string, key: string) => {
  return new Promise<void>((res, rej) => {
    const output = createWriteStream(outputFilePath);
    const input = createDecryptFileStream(inputFilePath, key);
    input.pipe(output);
    input.on("error", (err) => {
      rej();
      output.destroy(err);
      output.end();
    });
    output.on("error", (err) => {
      rej();
    });
    input.on("end", () => {
      res();
    });
  });
};
export const createDecryptFileStream = (inputFilePath: string, key: string) => {
  const decipher = createDecipheriv(algorithm, getKey(key), iv);
  const input = createReadStream(inputFilePath);
  const passThrough = new PassThrough();
  pipeline(input, decipher, passThrough, (err) => {
    if (err) {
      passThrough.emit("error", err);
    }
  });
  decipher.on("error", (err) => {
    passThrough.emit("error", err);
  });
  return passThrough;
};
export const createEncryptFileStream = (inputFilePath: string, key: string) => {
  const decipher = createCipheriv(algorithm, getKey(key), iv);
  const input = createReadStream(inputFilePath);
  const passThrough = new PassThrough();
  pipeline(input, decipher, passThrough, (err) => {
    if (err) {
      passThrough.emit("error", err);
    }
  });
  decipher.on("error", (err) => {
    passThrough.emit("error", err);
  });
  return passThrough;
};
