import { readFile, stat, writeFile } from "fs/promises";
import * as mobilenet from "@tensorflow-models/mobilenet";
import * as tf from "@tensorflow/tfjs";
import sharp from "sharp";

import "@tensorflow/tfjs-backend-wasm";

import { extraFiles } from "@/_defines/extraFiles";
import { mobilenetURLToFilename } from "@/main/utils/mobilenetURLToFileName";
import { resolveExtraFilesPath } from "@/main/utils/resolveExtraFilesPath";

function minURL(url: string) {
  const pad1 = 20;
  const pad2 = 30;
  if (url.length < pad1 + pad2) {
    return url;
  }
  return url.slice(0, pad1) + "..." + url.slice(-pad2);
}
export class TensorFlow {
  model: tf.GraphModel<string | tf.io.IOHandler> | undefined;
  constructor() {}
  async init() {
    await tf.setBackend("wasm");
    // modelCacher.start();
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
            console.log("TF:", "override fetch!", minURL(url), "->", minURL(path));
            await stat(path);
            return new Response(await readFile(path));
          } else {
            console.log("TF:", "through fetch!", minURL(url));
            return fetch(url);
          }
        },
      },
    );
    // modelCacher.end();
  }
  startScope() {
    tf.engine().startScope();
  }
  endScope() {
    tf.engine().endScope();
  }
  async preprocessImage(source: string | Buffer) {
    const { data, info } = await sharp(source)
      .resize(224, 224)
      .raw()
      .removeAlpha()
      .toBuffer({ resolveWithObject: true });
    const tensor = tf.tensor(data, [info.height, info.width, info.channels]).toFloat();
    const expandedTensor = tensor.expandDims();
    return expandedTensor.div(255);
  }
  async imageToVector(source: string | Buffer) {
    if (this.model === undefined) {
      throw "mobilenet is not initialized";
    }
    const preprocessedImage = await this.preprocessImage(source);
    const embeddings = this.model.predict(preprocessedImage) as tf.Tensor;
    return embeddings;
  }
  async similarity(vecA: tf.Tensor, vecB: tf.Tensor) {
    const dotProduct = tf.sum(tf.mul(vecA, vecB));
    const normA = tf.sqrt(tf.sum(tf.square(vecA)));
    const normB = tf.sqrt(tf.sum(tf.square(vecB)));
    return dotProduct.div(normA.mul(normB)).dataSync()[0];
  }
  vectorToBuffer(vec: tf.Tensor) {
    const data = vec.dataSync();
    return Buffer.from(data.buffer);
  }
  bufferToVector(buffer: Buffer) {
    const data = new Float32Array(buffer.buffer);
    return tf.tensor(data);
  }
}
