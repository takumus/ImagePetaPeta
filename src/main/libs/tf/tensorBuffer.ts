import { Tensor, tensor } from "@tensorflow/tfjs";

export const tensorBuffer = {
  toBuffer(vec: Tensor) {
    const data = vec.dataSync();
    return Buffer.from(data.buffer);
  },
  toTensor(buffer: Buffer) {
    const data = new Float32Array(buffer.buffer);
    return tensor(data);
  },
};
