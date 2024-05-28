import { tensor as _tensor, Tensor } from "@tensorflow/tfjs";

const VERSION = 0x7ffff001;
const NUM_BYTE_LENGTH = 4;
export const tensorBuffer = {
  toBuffer(tensor: Tensor) {
    const shape = tensor.shape;
    const data = tensor.dataSync();
    const buffer = Buffer.alloc(
      NUM_BYTE_LENGTH +
        NUM_BYTE_LENGTH +
        shape.length * NUM_BYTE_LENGTH +
        data.length * NUM_BYTE_LENGTH,
    );
    let offset = 0;
    // バージョン
    buffer.writeInt32LE(VERSION, offset);
    offset += NUM_BYTE_LENGTH;
    // shape次元数
    buffer.writeInt32LE(shape.length, offset);
    offset += NUM_BYTE_LENGTH;
    // shape
    shape.forEach((dim, index) => buffer.writeInt32LE(dim, offset + index * NUM_BYTE_LENGTH));
    // data
    data.forEach((value, index) =>
      buffer.writeFloatLE(value, offset + shape.length * NUM_BYTE_LENGTH + index * NUM_BYTE_LENGTH),
    );
    return buffer;
  },
  toTensor(buffer: Buffer) {
    let offset = 0;
    const version = buffer.readInt32LE(offset);
    if (version !== VERSION) {
      throw `tensor version "${version.toString(16)}" is not match "${VERSION.toString(16)}"`;
    }
    offset += NUM_BYTE_LENGTH;
    // shape次元数
    const shapeLength = buffer.readInt32LE(offset);
    offset += NUM_BYTE_LENGTH;
    // shape
    const shape: number[] = [];
    for (let i = 0; i < shapeLength; i++) {
      shape.push(buffer.readInt32LE(offset + i * NUM_BYTE_LENGTH));
    }
    // data
    const data: number[] = [];
    for (
      let i = 0;
      i < (buffer.length - offset - shapeLength * NUM_BYTE_LENGTH) / NUM_BYTE_LENGTH;
      i++
    ) {
      data.push(buffer.readFloatLE(offset + shapeLength * NUM_BYTE_LENGTH + i * NUM_BYTE_LENGTH));
    }
    return _tensor(data, shape);
  },
};
