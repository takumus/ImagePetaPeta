import { PLACEHOLDER_COMPONENT, PLACEHOLDER_SIZE } from "@/commons/defines";
import { encode as encodePlaceholder } from "blurhash";
import sharp from "sharp";
import * as file from "@/mainProcess/storages/file";
import Vibrant from "node-vibrant";
import { Swatch } from "@vibrant/color";
import { PetaColor } from "@/commons/datas/petaColor";
import { rgbDiff } from "@vibrant/color/lib/converter";
const quantize = require('quantize');
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
  const resizedData = await sharp(params.data)
  .resize(params.size)
  .webp({ quality: params.quality })
  .toBuffer({ resolveWithObject: true });
  const thumbWidth = resizedData.info.width;
  const thumbHeight = resizedData.info.height;
  const [_, placeholder, mainPalette, subPalette] = await Promise.all([
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
      const placeholderBuffer = await sharp(resizedData.data)
      .resize(PLACEHOLDER_SIZE)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
      return encodePlaceholder(
        placeholderBuffer.data as any as Uint8ClampedArray,
        placeholderBuffer.info.width,
        placeholderBuffer.info.height,
        PLACEHOLDER_COMPONENT, PLACEHOLDER_COMPONENT
      );
    })(),
    (async () => {
      return await new Vibrant(
        await sharp(resizedData.data)
        .png()
        .toBuffer(),
        { quality: 1 }
      ).getPalette();
    })(),
    (async () => {
      const raw = await sharp(resizedData.data)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
      return getSubPalette(
        raw.data,
        raw.info.width,
        raw.info.height,
        20,
        1
      ) || [];
    })()
  ]);
  // 合成パレット
  const mergedPalette: PetaColor[] = [];
  // 特徴パレット
  mergedPalette.push(...Object.values(mainPalette).map((s) => swatchToPetaColor(s)));
  // 全体パレット
  mergedPalette.push(...subPalette);
  const allPalette: PetaColor[] = [];
  if (mergedPalette.length > 0) {
    // 鮮やか順に
    mergedPalette.sort((a, b) => {
      return (Math.max(b.r, b.g, b.b) - Math.min(b.r, b.g, b.b)) - (Math.max(a.r, a.g, a.b) - Math.min(a.r, a.g, a.b));
    });
    allPalette.push(...mergedPalette);
    // cie94色差で色削除
    for (let i = 0; i < mergedPalette.length; i++) {
      for (let ii = i + 1; ii < mergedPalette.length; ii++) {
        const cieDiff = getDiff(mergedPalette[i]!, mergedPalette[ii]!);
        if ((cieDiff < 20 && mergedPalette[ii]!.population == 0) || cieDiff < 15) {
          mergedPalette.splice(ii, 1);
          ii--;
        }
      }
    }
  }
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
    palette: mergedPalette,
    allPalette: allPalette,
    placeholder
  };
  return data;
}
function swatchToPetaColor(swatch: Swatch | null): PetaColor {
  if (!swatch) {
    return {
      r: 255,
      g: 255,
      b: 255,
      population: 0,
    }
  }
  return {
    r: swatch.r,
    g: swatch.g,
    b: swatch.b,
    population: swatch.population
  }
}

function createPixels(buffer: Buffer, pixelCount: number, quality: number) {
  const pixels: [number, number, number][] = [];
  for (let i = 0; i < pixelCount; i += quality) {
    const offset = i * 4;
    const r = buffer[offset + 0]!;
    const g = buffer[offset + 1]!;
    const b = buffer[offset + 2]!;
    const a = buffer[offset + 3]!;
    if (a === undefined || a >= 125) {
      pixels.push([r, g, b]);
    }
  }
  return pixels;
}
function getSubPalette(buffer: Buffer, width: number, height: number, colorCount = 20, quality = 1): PetaColor[] {
  const pixelCount = width * height;
  const pixels = createPixels(buffer, pixelCount, quality);
  const cmap = quantize(pixels, colorCount)
  const palette = cmap ? cmap.palette() as [number, number, number][] : undefined;
  return palette?.map((color) => {
    return {
      r: color[0],
      g: color[1],
      b: color[2],
      population: 0
    }
  }) || [];
}
// function getSubPalette2(buffer: Buffer, width: number, height: number, colorCount = 20, quality = 1): PetaColor[] {
//   const pixelCount = width * height;
//   const pixels = createPixels(buffer, pixelCount, quality);
//   // const cmap = quantize(pixels, colorCount)
//   // const palette = cmap ? cmap.palette() as [number, number, number][] : undefined;
//   const palette = ATCQ.quantizeSync(pixels, {
//     maxColors: 32
//   });
//   return palette?.map((color: any) => {
//     return {
//       r: color[0],
//       g: color[1],
//       b: color[2],
//       population: 0
//     }
//   }) || [];
// }
function getDiff(color1: PetaColor, color2: PetaColor) {
  return rgbDiff(
    [color1.r, color1.g, color1.b],
    [color2.r, color2.g, color2.b]
  );
}