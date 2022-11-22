// import { generateMetadata } from "@/main/utils/generateMetadata";
import sharp from "sharp";
import { parentPort } from "worker_threads";

import * as file from "@/main/libs/file";
import { initWorkerThreads } from "@/main/libs/initWorkerThreads";
import { getSimplePalette } from "@/main/utils/generateMetadata/generatePalette";

export default initWorkerThreads<
  { data: Buffer; outputFilePath: string; size: number; quality: number },
  Awaited<ReturnType<typeof generateMetadata>>
>(parentPort, (parentPort) => {
  parentPort.on("message", async (params) => {
    const metadata = await generateMetadata(params);
    parentPort.postMessage(metadata);
  });
});
async function generateMetadata(params: {
  data: Buffer;
  outputFilePath: string;
  size: number;
  quality: number;
}) {
  // ファイル情報
  const metadata = await sharp(params.data, { limitInputPixels: false }).metadata();
  const originalWidth = metadata.width;
  const originalHeight = metadata.height;
  const format = metadata.format;
  // サイズ取得できなかったらダメ
  if (originalWidth === undefined || originalHeight === undefined || format === undefined) {
    throw "invalid image data";
  }
  // サムネイル作成
  const resizedData = await sharp(params.data, { limitInputPixels: false })
    .resize(params.size)
    .webp({ quality: params.quality })
    .toBuffer({ resolveWithObject: true });
  const thumbWidth = resizedData.info.width;
  const thumbHeight = resizedData.info.height;
  const [, palette] = await Promise.all([
    (async () => {
      // gifはサムネイルを作成しない
      if (format === "gif") {
        await file.writeFile(params.outputFilePath + ".gif", params.data);
      } else {
        await file.writeFile(params.outputFilePath + ".webp", resizedData.data);
      }
      return format;
    })(),
    (async () => {
      // パレットを取得
      const raw = await sharp(resizedData.data, { limitInputPixels: false })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      const palette =
        getSimplePalette({
          buffer: raw.data,
          width: raw.info.width,
          height: raw.info.height,
        }) || [];
      return palette;
    })(),
  ]);
  const data = {
    thumbnail: {
      width: thumbWidth,
      height: thumbHeight,
      format: format === "gif" ? "gif" : "webp",
    },
    original: {
      width: originalWidth,
      height: originalHeight,
      format,
    },
    palette: palette,
    allPalette: [],
  };
  return data;
}