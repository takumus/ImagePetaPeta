import { Frame, decompressFrame, parseGIF } from "gifuct-js";

import { initWebWorkerThreads } from "@/renderer/utils/initWebWorker";
import {
  DecompressWorkerInputData,
  DecompressWorkerOutputData,
} from "@/renderer/utils/pixi-gif/decoder/decompressWorkerData";

export default initWebWorkerThreads<DecompressWorkerInputData, DecompressWorkerOutputData>(
  self,
  (worker) => {
    worker.addEventListener("message", async (e) => {
      const canvas = new OffscreenCanvas(0, 0);
      const context = canvas.getContext("2d");
      const patchCanvas = new OffscreenCanvas(0, 0);
      const patchContext = patchCanvas.getContext("2d");
      if (patchContext === null || context === null) {
        throw new Error("context is undefined");
      }
      const data = e.data;
      const gif = parseGIF(data.buffer);
      const frames = (gif.frames as Frame[]).filter((f) => f.image);
      frames.forEach((f, i) => {
        const frame = decompressFrame(f, gif.gct, true);
        if (i === 0) {
          canvas.width = frame.dims.width;
          canvas.height = frame.dims.height;
        }
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
        worker.postMessage({
          imageData,
          delay,
          index: i,
          length: frames.length,
          isLast: i === frames.length - 1,
        } as DecompressWorkerOutputData);
      });
    });
  },
);
