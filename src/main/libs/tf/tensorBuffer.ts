import { tensor as _tensor, Tensor } from "@tensorflow/tfjs";

export const tensorBuffer = {
  toBuffer(tensor: Tensor) {
    const shape = tensor.shape;
    const data = tensor.dataSync();
    const buffer = Buffer.alloc(4 + shape.length * 4 + data.length * 4);
    // shape次元数
    buffer.writeInt32LE(shape.length, 0);
    // shape
    shape.forEach((dim, index) => buffer.writeInt32LE(dim, 4 + index * 4));
    // data
    data.forEach((value, index) => buffer.writeFloatLE(value, 4 + shape.length * 4 + index * 4));
    return buffer;
  },
  toTensor(buffer: Buffer) {
    // shape次元数
    const shapeLength = buffer.readInt32LE(0);
    // shape
    const shape: number[] = [];
    for (let i = 0; i < shapeLength; i++) {
      shape.push(buffer.readInt32LE(4 + i * 4));
    }
    // data
    const data: number[] = [];
    for (let i = 0; i < (buffer.length - 4 - shapeLength * 4) / 4; i++) {
      data.push(buffer.readFloatLE(4 + shapeLength * 4 + i * 4));
    }
    return _tensor(data, shape);
  },
};
