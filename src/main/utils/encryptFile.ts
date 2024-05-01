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
    const input = createReadStream(inputFilePath);
    const output = createWriteStream(outputFilePath);
    const cipher = createCipheriv(algorithm, getKey(key), iv);
    input.on("data", (data) => {
      output.write(cipher.update(data));
    });
    input.on("end", () => {
      try {
        output.write(cipher.final());
      } catch (err) {
        rej(err);
      }
      output.end();
      output.close(() => {
        res();
      });
    });
  });
};
export const decryptFile = (inputFilePath: string, outputFilePath: string, key: string) => {
  return new Promise<void>((res, rej) => {
    const output = createWriteStream(outputFilePath);
    const input = createReadStream(inputFilePath);
    const cipher = createDecipheriv(algorithm, getKey(key), iv);
    input.on("data", (data) => {
      output.write(cipher.update(data as Buffer));
    });
    input.on("end", () => {
      try {
        output.write(cipher.final());
      } catch (err) {
        rej(err);
      }
      output.end();
      output.close(() => {
        res();
      });
    });
  });
};

export const decryptFileStream = (inputFilePath: string, key: string) => {
  const decipher = createDecipheriv(algorithm, getKey(key), iv);
  const input = createReadStream(inputFilePath);
  // pipelineを用いて、inputとdecipherを連結し、decryptStreamにデータをpushする
  const passThrough = new PassThrough();
  pipeline(input, decipher, passThrough, (err) => {
    if (err) {
      // エラーハンドリング：passThroughストリームにエラーを通知
      passThrough.emit("error", err);
      return;
    }
    // 終了時の処理が必要であればここに記述
  });

  return passThrough;
};
