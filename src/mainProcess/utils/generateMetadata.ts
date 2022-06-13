import sharp from "sharp";
import * as file from "@/mainProcess/storages/file";
import { getSimplePalette } from "./generatePalette";
export async function generateMetadata(params: {
    data: Buffer,
    outputFilePath: string,
    size: number,
    quality: number
}) {
  console.time(" mtd");
  const metadata = await sharp(params.data).metadata();
  console.timeEnd(" mtd");
  const originalWidth = metadata.width;
  const originalHeight = metadata.height;
  const format = metadata.format;
  if (originalWidth === undefined || originalHeight === undefined || format === undefined) {
    throw "invalid image data";
  }
  console.time(" rsz");
  const resizedData = await sharp(params.data)
  .resize(params.size)
  .webp({ quality: params.quality })
  .toBuffer({ resolveWithObject: true });
  console.timeEnd(" rsz");
  const thumbWidth = resizedData.info.width;
  const thumbHeight = resizedData.info.height;
  const [_, palette] = await Promise.all([
    (async () => {
      if (format === "gif") {
        await file.writeFile(
          params.outputFilePath + ".gif",
          params.data
        );
      } else {
        await file.writeFile(
          params.outputFilePath + ".webp",
          resizedData.data
        );
      }
      return format;
    })(),
    (async () => {
      console.time(" srp");
      const raw = await sharp(resizedData.data)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
      console.timeEnd(" srp");
      console.time(" plt");
      const palette = getSimplePalette(
        {
          buffer: raw.data,
          width: raw.info.width,
          height: raw.info.height,
          sample: 2000,
          mergeCIEDiff: 5,
          fixColorCIEDiff: 10
        }
      ) || [];
      console.timeEnd(" plt");
      return palette;
    })()
  ]);
  const data = {
    thumbnail: {
      width: thumbWidth,
      height: thumbHeight,
      format: (format === "gif" ? "gif" : "webp")
    },
    original: {
      width: originalWidth,
      height: originalHeight,
      format
    },
    palette: palette,
    allPalette: [],
    placeholder: ""
  };
  return data;
}