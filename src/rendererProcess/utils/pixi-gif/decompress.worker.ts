import { parseGIF, decompressFrame, Frame } from 'gifuct-js';
import { DecompressWorkerData } from './decompressWorkerData';
const w: Worker = self as any;

w.addEventListener('message', async (e) => {
  const gif = parseGIF(e.data);
  const frames = (gif.frames as Frame[]).filter((f) => f.image);
  frames.map((f) => {
    return decompressFrame(f, gif.gct, true);
  }).forEach((pf, i) => {
    w.postMessage({
      parsedFrame: pf,
      index: i,
      length: frames.length,
      isLast: i === frames.length - 1
    } as DecompressWorkerData);
    delete (pf as any).pixels;
    delete (pf as any).patch;
  });
})
export default w;