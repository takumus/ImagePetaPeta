/* eslint-disable */
import { parseGIF, decompressFrame, Frame, decompressFrames } from "gifuct-js";
import {
  DecompressWorkerInputData,
  DecompressWorkerOutputData,
} from "@/rendererProcess/utils/pixi-gif/decompressWorkerData";
const w: Worker = self as any;

w.addEventListener("message", async (e) => {
  const canvas = new OffscreenCanvas(0, 0);
  const context = canvas.getContext("2d")!;
  const patchCanvas = new OffscreenCanvas(0, 0);
  const patchContext = patchCanvas.getContext("2d")!;
  const data = e.data as DecompressWorkerInputData;
  console.time("parse");
  const gif = parseGIF(data.buffer);
  console.timeEnd("parse");
  console.time("frames");
  const frames = (gif.frames as Frame[]).filter((f) => f.image);
  console.timeEnd("frames");
  frames.forEach((f, i) => {
    const frame = decompressFrame(f, gif.gct, true);
    if (i === 0) {
      canvas.width = frame.dims.width;
      canvas.height = frame.dims.height;
    }
    // Some GIF's omit the disposalType, so let's assume clear if missing
    const {
      disposalType = 2,
      delay = data.defaultDelay,
      patch,
      dims: { width, height, left, top },
    } = frame;

    patchCanvas.width = width;
    patchCanvas.height = height;
    patchContext.clearRect(0, 0, width, height);
    const patchData = patchContext.createImageData(width, height);

    patchData.data.set(patch);
    patchContext.putImageData(patchData, 0, 0);

    context.drawImage(patchCanvas, left, top);
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

    if (disposalType === 2) {
      context.clearRect(0, 0, width, height);
    }
    w.postMessage({
      imageData,
      delay,
      index: i,
      length: frames.length,
      isLast: i === frames.length - 1,
    } as DecompressWorkerOutputData);
  });
});
export default w;
