import { readFile, writeFile } from "fs/promises";
import * as mobilenet from "@tensorflow-models/mobilenet";
import * as tf from "@tensorflow/tfjs-node";
import sharp from "sharp";

import "@tensorflow/tfjs-backend-wasm";

// MobileNetを使って特徴量を抽出する関数
const getFeatureVector = async (path: string, model: mobilenet.MobileNet) => {
  const { data, info } = await sharp(path)
    .resize(224, 224)
    .raw()
    .removeAlpha()
    .toBuffer({ resolveWithObject: true });
  const image = tf.tensor3d(data, [info.width, info.height, 3]);
  const result = model.infer(image).flatten();
  image.dispose(); // メモリ解放
  return result;
};

// コサイン類似度を計算する関数
const cosineSimilarity = async (vecA: tf.Tensor, vecB: tf.Tensor) => {
  const dotProduct = vecA.dot(vecB);
  const normA = vecA.norm();
  const normB = vecB.norm();
  const similarity = dotProduct.div(normA.mul(normB)).array();
  vecA.dispose(); // メモリ解放
  vecB.dispose(); // メモリ解放
  return similarity;
};
// 特徴ベクトルをバイナリファイルに保存する関数
const saveFeatureVector = async (vec: tf.Tensor, filePath: string) => {
  const data = vec.dataSync();
  const buffer = Buffer.from(data.buffer);
  await writeFile(filePath, buffer);
};

// バイナリファイルから特徴ベクトルを復元する関数
const loadFeatureVector = async (filePath: string) => {
  const buffer = await readFile(filePath);
  const data = new Float32Array(buffer.buffer);
  return tf.tensor(data);
};

export const __main = async (model: mobilenet.MobileNet) => {
  console.time("processing1");
  const vecs = await Promise.all([
    getFeatureVector("C:\\Users\\takumus\\Desktop\\si\\1.jpg", model),
    getFeatureVector("C:\\Users\\takumus\\Desktop\\si\\2.jpg", model),
  ]);
  // console.log(vecs[0]);
  // await saveFeatureVector(vecs[0], "featureVector1.json");
  console.timeEnd("processing1");

  // 特徴ベクトルをファイルから復元
  // console.time("loadVector");
  // const loadedVec = await loadFeatureVector("featureVector1.json");
  // console.timeEnd("loadVector");

  console.time("processing2");
  const similarity = await cosineSimilarity(...vecs);
  console.timeEnd("processing2");

  console.log(`Cosine Similarity: ${similarity}`);
};
