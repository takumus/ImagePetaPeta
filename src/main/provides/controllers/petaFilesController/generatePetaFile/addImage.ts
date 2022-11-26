import sharp from "sharp";

import {
  BROWSER_THUMBNAIL_QUALITY,
  BROWSER_THUMBNAIL_SIZE,
  PETAIMAGE_METADATA_VERSION,
} from "@/commons/defines";

import { AddFileInfo } from "@/main/provides/controllers/petaFilesController/generatePetaFile/addFile";
import { getSimplePalette } from "@/main/utils/generateMetadata/generatePalette";

export async function addImage(buffer: Buffer, ext: string): Promise<AddFileInfo> {
  const metadata = await sharp(buffer, { limitInputPixels: false }).metadata();
  if (metadata.orientation !== undefined) {
    // jpegの角度情報があったら回転する。pngにする。
    buffer = await sharp(buffer, { limitInputPixels: false }).rotate().png().toBuffer();
    ext = "png";
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
    extention: ext,
    metadata: {
      type: "image",
      width: metadata.width,
      height: metadata.height,
      palette: palette,
      version: PETAIMAGE_METADATA_VERSION,
    },
  };
}
