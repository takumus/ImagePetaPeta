import { readFile, stat } from "fs/promises";
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
export class LibTF {
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
  preprocessImage(data: Buffer, info: sharp.OutputInfo) {
    const tensor = tf.tensor(data, [info.height, info.width, info.channels]).toFloat();
    const expandedTensor = tensor.expandDims();
    tensor.dispose();
    return expandedTensor.div(255);
  }
  async imageToTensor(source: string | Buffer) {
    const { data, info } = await createImageForTensor(source);
    // .modulate({ saturation: 0})
    // .resize(224, 224, { fit: "fill" })
    // .raw()
    // .removeAlpha()
    // .toBuffer({ resolveWithObject: true });
    // console.log(info);
    return tf.tidy(() => {
      if (this.model === undefined) {
        throw "mobilenet is not initialized";
      }
      const preprocessedImage = this.preprocessImage(data, info);
      return (this.model.predict(preprocessedImage) as tf.Tensor).reshape([1280]);
    });
  }
  similarity(vecA: tf.Tensor, vecB: tf.Tensor) {
    return tf.tidy(() => {
      const dotProduct = tf.sum(tf.mul(vecA, vecB));
      const normA = tf.sqrt(tf.sum(tf.square(vecA)));
      const normB = tf.sqrt(tf.sum(tf.square(vecB)));
      return dotProduct.div(normA.mul(normB)).dataSync()[0];
    });
  }
  tensorToBuffer(vec: tf.Tensor) {
    const data = vec.dataSync();
    return Buffer.from(data.buffer);
  }
  bufferToTensor(buffer: Buffer) {
    const data = new Float32Array(buffer.buffer);
    return tf.tensor(data);
  }
}
async function createImageForTensor(source: string | Buffer) {
  const noise = Buffer.alloc(224 * 224 * 3);
  for (let i = 0; i < noise.length; i++) {
    noise[i] = Math.round(0xff * Math.random());
  }
  const img = await sharp(source)
    .resize(224, 224, {
      fit: "inside",
    })
    .removeAlpha()
    .toBuffer();
  return await sharp(noise, { raw: { width: 224, height: 224, channels: 3 } })
    .composite([
      {
        input: img,
      },
    ])
    .raw()
    .removeAlpha()
    .toBuffer({ resolveWithObject: true });
}
