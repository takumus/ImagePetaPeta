import {
  AnimatedGIF,
  AnimatedGIFFrame,
  AnimatedGIFOptions,
} from "@/renderer/libs/pixi-gif/animatedGIF";
import DecompressWorker from "@/renderer/libs/pixi-gif/decoder/decompress.worker";
import { createWebWorkerGroup } from "@/renderer/libs/workerGroup";

const wtGroup = createWebWorkerGroup(DecompressWorker);
export function decodeFromBuffer(buffer: ArrayBuffer, options?: Partial<AnimatedGIFOptions>) {
  if (!buffer || buffer.byteLength === 0) {
    throw new Error("Invalid buffer");
  }
  const frames: AnimatedGIFFrame[] = [];
  let time = 0;
  const { fps } = Object.assign({}, AnimatedGIF.defaultOptions, options);
  console.log("GIF(worker): begin converting");
  const defaultDelay = 1000 / fps;
  let cancel = () => {
    //
  };
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const wt = wtGroup.getWT();
  const promise = new Promise<AnimatedGIF>((res, rej) => {
    cancel = rej;
    wt.use();
    wt.worker.postMessage({
      buffer,
      defaultDelay,
    });
    wt.worker.onerror = (e) => {
      wt.terminate();
      rej(e.message);
    };
    wt.worker.onmessage = (e) => {
      const data = e.data;
      console.log(`GIF(worker): converting (${data.index + 1}/${data.length})`);
      const endTime = time + data.delay;
      frames.push({
        start: time,
        end: endTime,
        imageData: data.imageData,
      });
      time = endTime;
      if (data.isLast) {
        wt.unuse();
        console.log("GIF(worker): complete converting");
        res(new AnimatedGIF(frames, options));
      }
    };
  });
  return {
    promise,
    cancel: () => {
      console.log("GIF(worker): cancel converting");
      wt.terminate();
      cancel();
    },
  };
}
