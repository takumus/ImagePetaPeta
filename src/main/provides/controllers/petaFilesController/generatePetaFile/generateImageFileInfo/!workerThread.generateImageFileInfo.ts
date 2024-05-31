import { FileTypeResult } from "file-type";
import sharp from "sharp";

import { GeneratedFileInfo } from "@/commons/datas/fileInfo";
import {
  BROWSER_THUMBNAIL_QUALITY,
  BROWSER_THUMBNAIL_SIZE,
  PETAIMAGE_METADATA_VERSION,
} from "@/commons/defines";

import { initWorkerThreads } from "@/main/libs/initWorkerThreads";
import { getSimplePalette } from "@/main/provides/controllers/petaFilesController/generatePetaFile/generateImageFileInfo/generatePalette";

export default initWorkerThreads<typeof generateImageFileInfo>((port) => {
  port.on("message", async (params) => {
    const petaFile = await generateImageFileInfo(params);
    port.postMessage(petaFile);
  });
});

async function generateImageFileInfo(param: {
  buffer: Buffer;
  fileType: FileTypeResult;
}): Promise<GeneratedFileInfo> {
  let metadata = await sharp(param.buffer, { limitInputPixels: false }).metadata();
  let extention = param.fileType.ext;
  let mimeType = param.fileType.mime;
  let buffer = param.buffer;
  let transformed = false;
  if (metadata.orientation !== undefined) {
    // jpegの角度情報があったら回転する。pngにする。
    transformed = true;
    buffer = await sharp(param.buffer, { limitInputPixels: false }).rotate().png().toBuffer();
    metadata = await sharp(buffer, { limitInputPixels: false }).metadata();
    extention = "png";
    mimeType = "image/png";
  }
  if (metadata.width === undefined || metadata.height === undefined) {
    throw new Error("unsupported image");
  }
  const thumbnailsBuffer = await sharp(buffer, { limitInputPixels: false })
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
      transformedBuffer: transformed ? buffer : undefined,
      extention,
    },
    metadata: {
      type: "image",
      gif: extention === "gif",
      width: metadata.width,
      height: metadata.height,
      palette: palette,
      version: PETAIMAGE_METADATA_VERSION,
      mimeType,
    },
  };
}
