import { readFile, stat } from "fs/promises";
import * as tf from "@tensorflow/tfjs";
import sharp from "sharp";

import "@tensorflow/tfjs-backend-wasm";

import { extraFiles } from "@/_defines/extraFiles";
import { mobilenetURLToFilename } from "@/main/utils/mobilenetURLToFileName";
import { resolveExtraFilesPath } from "@/main/utils/resolveExtraFilesPath";

export class TFImageClassification {
  model: tf.GraphModel<string | tf.io.IOHandler> | undefined;
  constructor() {}
  async init() {
    await tf.setBackend("wasm");
    this.model = await tf.loadGraphModel(
      "+https://www.kaggle.com/models/google/mobilenet-v3/TfJs/large-100-224-feature-vector/1",
      {
        fromTFHub: true,
        fetchFunc: async (url) => {
          if (typeof url !== "string") {
            throw "input is not string";
          }
          if (url.startsWith("+https://")) {
            url = url.substring(1);
            const filename = mobilenetURLToFilename(url);
            const path = resolveExtraFilesPath(
              extraFiles["mobilenet.universal"][
                filename as keyof (typeof extraFiles)["mobilenet.universal"]
              ],
            );
            console.log("TF:", "override fetch!", this.minURL(url), "->", this.minURL(path));
            await stat(path);
            return new Response(await readFile(path));
          } else {
            console.log("TF:", "through fetch!", this.minURL(url));
            return fetch(url);
          }
        },
      },
    );
  }
  async imageToTensor(source: string | Buffer, croppingType: 0 | 1 = 1) {
    const { data, info } = await this.createImage(source, croppingType);
    return tf.tidy(() => {
      if (this.model === undefined) {
        throw "mobilenet is not initialized";
      }
      const preprocessedImage = tf
        .tensor(data, [info.height, info.width, info.channels])
        .toFloat()
        .div(tf.scalar(255))
        .expandDims();
      const tensor = this.model.predict(preprocessedImage) as tf.Tensor;
      return tensor.reshape([1280]);
    });
  }
  similarity(tensorA: tf.Tensor, tensorB: tf.Tensor) {
    return tf.tidy(() => {
      const normA = tf.sqrt(tf.sum(tf.square(tensorA), -1, true));
      const normB = tf.sqrt(tf.sum(tf.square(tensorB), -1, true));
      const dotProduct = tf.matMul(tensorA, tensorB, false, true);
      const similarity = dotProduct.div(tf.matMul(normA, normB, false, true));
      return Math.max(...similarity.dataSync());
    });
  }
  private async createImage(source: string | Buffer, croppingType: 0 | 1) {
    return await sharp(
      await sharp(source)
        .resize(224, 224, {
          fit: "cover",
          position: croppingType === 0 ? sharp.strategy.attention : sharp.strategy.entropy,
        })
        .ensureAlpha(1)
        .toBuffer(),
    )
      .raw()
      .removeAlpha()
      .toBuffer({ resolveWithObject: true });
  }

  private minURL(url: string) {
    const pad1 = 20;
    const pad2 = 30;
    if (url.length < pad1 + pad2) {
      return url;
    }
    return url.slice(0, pad1) + "..." + url.slice(-pad2);
  }
}
