import { createCipheriv, createDecipheriv, createHash } from "crypto";
import { createReadStream, createWriteStream } from "fs";
import { PassThrough, pipeline } from "stream";

type Mode = "encrypt" | "decrypt";
const algorithm = "aes-192-cbc" as const;
const iv = Buffer.alloc(16, 0);
function getKey(key: string) {
  return createHash("sha256").update(key).digest("base64").substring(0, 24);
}
export const secureFile = {
  encrypt: {
    asFile: (inputFilePath: string, outputFilePath: string, key: string) =>
      encryptFile(inputFilePath, outputFilePath, key, "encrypt"),
    asStream: (inputFilePath: string, key: string) =>
      createEncryptFileStream(inputFilePath, key, "encrypt"),
  },
  decrypt: {
    asFile: (inputFilePath: string, outputFilePath: string, key: string) =>
      encryptFile(inputFilePath, outputFilePath, key, "decrypt"),
    asStream: (inputFilePath: string, key: string) =>
      createEncryptFileStream(inputFilePath, key, "decrypt"),
  },
};
function encryptFile(inputFilePath: string, outputFilePath: string, key: string, mode: Mode) {
  return new Promise<void>((res, rej) => {
    const output = createWriteStream(outputFilePath);
    const input = createEncryptFileStream(inputFilePath, key, mode);
    input.pipe(output);
    input.on("error", (err) => {
      rej();
      output.destroy(err);
      output.end();
    });
    output.on("error", (err) => {
      rej(err);
    });
    input.on("end", () => {
      res();
    });
  });
}
function createEncryptFileStream(inputFilePath: string, key: string, mode: Mode) {
  const decipher = (mode === "encrypt" ? createCipheriv : createDecipheriv)(
    algorithm,
    getKey(key),
    iv,
  );
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
}
