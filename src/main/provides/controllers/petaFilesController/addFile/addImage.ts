import sharp from "sharp";

import { AddFileInfo } from "@/main/provides/controllers/petaFilesController/addFile/addFile";

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
  return {
    thumbnailsBuffer: buffer,
    ext,
    width: metadata.width,
    height: metadata.height,
  };
}
