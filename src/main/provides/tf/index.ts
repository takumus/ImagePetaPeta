import { readFile, stat, writeFile } from "fs/promises";
import * as mobilenet from "@tensorflow-models/mobilenet";
import * as tf from "@tensorflow/tfjs";
import sharp from "sharp";

import "@tensorflow/tfjs-backend-wasm";

import { basename, resolve } from "path";

import { extraFiles } from "@/_defines/extraFiles";
import { mkdirIfNotIxistsSync } from "@/main/libs/file";
import { resolveExtraFilesPath } from "@/main/utils/resolveExtraFilesPath";

const modelCacher = (() => {
  const dir = "./_tfCache";
  const originalFetch = global.fetch;
  let started = false;
  return {
    start() {
      if (started) {
        return;
      }
      started = true;
      mkdirIfNotIxistsSync(dir, { recursive: true });
      global.fetch = async (...args: Parameters<typeof originalFetch>) => {
        const url = args[0];
        if (
          typeof url === "string" &&
          url.startsWith("https://tfhub.dev/google/imagenet/mobilenet_v1_100_224/classification/1/")
        ) {
          console.log(url);
          const filename = new URL(url).pathname.split("/").pop();
          if (filename === undefined) {
            throw new Error("unknown url:" + url);
          }
          const cached = resolveExtraFilesPath(
            extraFiles["mobilenet.universal"][
              filename as keyof (typeof extraFiles)["mobilenet.universal"]
            ],
          );
          await stat(cached);
          return new Response(await readFile(cached));
        }
        return originalFetch(...args);
      };
    },
    end() {
      if (!started) {
        return;
      }
      started = false;
      global.fetch = originalFetch;
    },
  };
})();
export class TensorFlow {
  model: mobilenet.MobileNet | undefined;
  constructor() {}
  async init() {
    await tf.setBackend("wasm");
    modelCacher.start();
    this.model = await mobilenet.load();
    modelCacher.end();
  }
  async imageToVector(source: string | Buffer) {
    if (this.model === undefined) {
      throw "mobilenet is not initialized";
    }
    const { data, info } = await sharp(source)
      .resize(224, 224)
      .raw()
      .removeAlpha()
      .toBuffer({ resolveWithObject: true });
    const image = tf.tensor3d(data, [info.width, info.height, 3]);
    const result = this.model.infer(image).flatten();
    image.dispose();
    return result;
  }
  async similarity(vecA: tf.Tensor, vecB: tf.Tensor) {
    const dotProduct = vecA.dot(vecB);
    const normA = vecA.norm();
    const normB = vecB.norm();
    const similarity = dotProduct.div(normA.mul(normB)).array();
    vecA.dispose();
    vecB.dispose();
    return similarity;
  }
  async vectorToBuffer(vec: tf.Tensor, filePath: string) {
    const data = vec.dataSync();
    const buffer = Buffer.from(data.buffer);
    await writeFile(filePath, buffer);
  }
  async bufferToVector(filePath: string) {
    const buffer = await readFile(filePath);
    const data = new Float32Array(buffer.buffer);
    return tf.tensor(data);
  }
}
