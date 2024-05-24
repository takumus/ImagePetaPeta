import * as tf from "@tensorflow/tfjs";
import sharp from "sharp";

import { tensorBuffer } from "@/main/libs/tf/tensorBuffer";

process.env.NODE_ENV = "development";
(async () => {
  const { TFImageClassification } = await import("@/main/libs/tf/tfImageClassification");
  const tfic = new TFImageClassification();
  await tfic.init();
  const tensor = tf.tensor([1, 2, 3, 4], [2, 2]);
  const buffer = tensorBuffer.toBuffer(tensor);
  console.log(tensor, tensorBuffer.toTensor(buffer));
})();
