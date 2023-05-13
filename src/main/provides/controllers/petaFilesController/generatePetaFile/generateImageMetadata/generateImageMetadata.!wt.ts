import { FileTypeResult } from "file-type";
import sharp from "sharp";
import { parentPort } from "worker_threads";

import { GeneratedFileInfo } from "@/commons/datas/fileInfo";
import {
  BROWSER_THUMBNAIL_QUALITY,
  BROWSER_THUMBNAIL_SIZE,
  PETAIMAGE_METADATA_VERSION,
} from "@/commons/defines";

import { initWorkerThreads } from "@/main/libs/initWorkerThreads";
import { getSimplePalette } from "@/main/provides/controllers/petaFilesController/generatePetaFile/generateImageMetadata/generatePalette";

export default initWorkerThreads<
  Parameters<typeof generateImageMetaData>[0],
  Awaited<ReturnType<typeof generateImageMetaData> | undefined>
>(parentPort, (parentPort) => {
  parentPort.on("message", async (params) => {
    try {
      const petaFile = await generateImageMetaData(params);
      parentPort.postMessage(petaFile);
    } catch {
      parentPort.postMessage(undefined);
    }
  });
});

async function generateImageMetaData(param: {
  buffer: Buffer;
  fileType: FileTypeResult;
}): Promise<GeneratedFileInfo> {
  const metadata = await sharp(param.buffer, { limitInputPixels: false }).metadata();
  let extention = param.fileType.ext;
  let mimeType = param.fileType.mime;
  if (metadata.orientation !== undefined) {
    // jpegの角度情報があったら回転する。pngにする。
    param.buffer = await sharp(param.buffer, { limitInputPixels: false }).rotate().png().toBuffer();
    extention = "png";
    mimeType = "image/png";
  }
  if (metadata.width === undefined || metadata.height === undefined) {
    throw new Error("unsupported image");
  }
  const thumbnailsBuffer = await sharp(param.buffer, { limitInputPixels: false })
    .resize(BROWSER_THUMBNAIL_SIZE)
    .webp({ quality: BROWSER_THUMBNAIL_QUALITY })
    .toBuffer({ resolveWithObject: true });
  const raw = await sharp(thumbnailsBuffer.data, { limitInputPixels: false })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const palette =
    getSimplePalette({
      buffer: raw.data,
      width: raw.info.width,
      height: raw.info.height,
    }) || [];
  return {
    thumbnail: {
      buffer: thumbnailsBuffer.data,
      extention: "webp",
    },
    original: {
      extention,
      mimeType,
    },
    metadata: {
      type: "image",
      gif: extention === "gif",
      width: metadata.width,
      height: metadata.height,
      palette: palette,
      version: PETAIMAGE_METADATA_VERSION,
    },
  };
}
