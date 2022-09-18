import sharp from "sharp";
import * as file from "@/mainProcess/storages/file";
import { getSimplePalette } from "@/mainProcess/utils/generatePalette";
export async function generateMetadata(params: {
  data: Buffer;
  outputFilePath: string;
  size: number;
  quality: number;
}) {
  const metadata = await sharp(params.data, { limitInputPixels: false }).metadata();
  const originalWidth = metadata.width;
  const originalHeight = metadata.height;
  const format = metadata.format;
  if (originalWidth === undefined || originalHeight === undefined || format === undefined) {
    throw "invalid image data";
  }
  const resizedData = await sharp(params.data, { limitInputPixels: false })
    .resize(params.size)
    .webp({ quality: params.quality })
    .toBuffer({ resolveWithObject: true });
  const thumbWidth = resizedData.info.width;
  const thumbHeight = resizedData.info.height;
  const [, palette] = await Promise.all([
    (async () => {
      if (format === "gif") {
        await file.writeFile(params.outputFilePath + ".gif", params.data);
      } else {
        await file.writeFile(params.outputFilePath + ".webp", resizedData.data);
      }
      return format;
    })(),
    (async () => {
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
    placeholder: "",
  };
  return data;
}
