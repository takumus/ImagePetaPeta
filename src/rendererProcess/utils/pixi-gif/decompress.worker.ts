import { parseGIF, decompressFrames } from 'gifuct-js';
const w: Worker = self as any;

w.addEventListener('message', async (e) => {
  w.postMessage(decompressFrames(e.data, true));
})
export default w;