import { createCipheriv, createDecipheriv, createHash } from "crypto";
import { createReadStream, createWriteStream } from "fs";

function getKey(key: string) {
  return createHash("sha256").update(key).digest("base64").substring(0, 24);
}
export const encryptFile = (inputFilePath: string, outputFilePath: string, key: string) => {
  return new Promise<void>((res) => {
    const inputReadStream = createReadStream(inputFilePath);
    const outputWriteStream = createWriteStream(outputFilePath);
    const cipher = createCipheriv("aes-192-cbc", getKey(key), Buffer.alloc(16, 0));
    let encrypted;
    inputReadStream.on("data", (data) => {
      encrypted = cipher.update(data);
      outputWriteStream.write(encrypted);
    });
    inputReadStream.on("end", () => {
      outputWriteStream.write(cipher.final());
      outputWriteStream.end();
      outputWriteStream.close(() => {
        res();
      });
    });
  });
};
export const decryptFile = (inputFilePath: string, outputFilePath: string, key: string) => {
  return new Promise<void>((res, rej) => {
    const outputWriteSteam = createWriteStream(outputFilePath);
    const inputReadStream = createReadStream(inputFilePath);

    const decipher = createDecipheriv("aes-192-cbc", getKey(key), Buffer.alloc(16, 0));
    let decrypted;
    inputReadStream.on("data", (data) => {
      decrypted = decipher.update(data as Buffer);
      outputWriteSteam.write(decrypted);
    });
    inputReadStream.on("end", () => {
      try {
        outputWriteSteam.write(decipher.final());
      } catch (err) {
        rej(err);
      }
      outputWriteSteam.end();
      outputWriteSteam.close(() => {
        res();
      });
    });
  });
};
