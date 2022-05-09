import { PLACEHOLDER_COMPONENT, PLACEHOLDER_SIZE } from "@/commons/defines";
import { encode as encodePlaceholder } from "blurhash";
import sharp from "sharp";
import * as file from "@/mainProcess/storages/file";
import Vibrant from "node-vibrant";
import { Swatch } from "@vibrant/color";
import { PetaImagePalette } from "@/commons/datas/petaImage";
import { PetaColor } from "@/commons/datas/petaColor";
export async function generateMetadata(params: {
    data: Buffer,
    outputFilePath: string,
    size: number,
    quality: number
  }) {
  const metadata = await sharp(params.data).metadata();
  const originalWidth = metadata.width;
  const originalHeight = metadata.height;
  const format = metadata.format;
  if (originalWidth === undefined || originalHeight === undefined || format === undefined) {
    throw "invalid image data";
  }
  const thumbWidth = Math.floor(params.size);
  const thumbHeight = Math.floor(originalHeight / originalWidth * params.size);
  const resizedData = await sharp(params.data)
  .resize(params.size)
  .webp({ quality: params.quality })
  .toBuffer();
  if (format === "gif") {
    await file.writeFile(
      params.outputFilePath + ".gif",
      params.data
    );
  } else {
    await file.writeFile(
      params.outputFilePath + ".webp",
      resizedData
    );
  }
  const placeholder = await new Promise<string>((res, rej) => {
    sharp(resizedData)
    .resize(PLACEHOLDER_SIZE)
    .raw()
    .ensureAlpha()
    .toBuffer((err, buffer, { width, height }) => {
      if (err) {
        rej(err);
        return;
      }
      try {
        res(encodePlaceholder(new Uint8ClampedArray(buffer), width, height, PLACEHOLDER_COMPONENT, PLACEHOLDER_COMPONENT));
      } catch(e) {
        rej(e);
      }
    });
  });
  const palette = await new Vibrant(
    await sharp(resizedData)
    .png()
    .toBuffer(),
    {
      quality: 1
    }
  ).getPalette();
  palette.DarkMuted
  return {
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
    palette: {
      vibrant: swatchToPetaColor(palette.Vibrant),
      darkVibrant: swatchToPetaColor(palette.DarkVibrant),
      lightVibrant: swatchToPetaColor(palette.LightVibrant),
      muted: swatchToPetaColor(palette.Muted),
      darkMuted: swatchToPetaColor(palette.DarkMuted),
      lightMuted: swatchToPetaColor(palette.LightMuted)
    } as PetaImagePalette,
    placeholder
  };
}
function swatchToPetaColor(swatch: Swatch | null): PetaColor {
  if (!swatch) {
    return {
      r: 255,
      g: 255,
      b: 255
    }
  }
  return {
    r: swatch.r,
    g: swatch.g,
    b: swatch.b
  }
}