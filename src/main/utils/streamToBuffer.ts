import { Readable } from "node:stream";
import { pipeline } from "stream/promises";

export async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Uint8Array[] = [];
  await pipeline(stream, async (source) => {
    for await (const chunk of source) {
      chunks.push(chunk);
    }
  });
  return Buffer.concat(chunks);
}
