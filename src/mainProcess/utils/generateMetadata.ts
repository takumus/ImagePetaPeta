import { PLACEHOLDER_COMPONENT, PLACEHOLDER_SIZE } from "@/commons/defines";
import { encode as encodePlaceholder } from "blurhash";
import sharp from "sharp";
import * as file from "@/mainProcess/storages/file";
import Vibrant from "node-vibrant";
import { Swatch } from "@vibrant/color";
import { PetaColor } from "@/commons/datas/petaColor";
import { rgbDiff, rgbToHsl } from "@vibrant/color/lib/converter";
import quantize from 'quantize';
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
      console.time(" sharp");
      const raw = await sharp(resizedData.data)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
      console.timeEnd(" sharp");
      console.time(" palette");
      const palette = getSubPalette(
        {
          buffer: raw.data,
          width: raw.info.width,
          height: raw.info.height,
          sample: 1000,
          mergeCIEDiff: 5,
          fixColorCIEDiff: 10
        }
      ) || [];
      console.timeEnd(" palette");
      return palette;
    })()
  ]);
  const allPalette: PetaColor[] = [];
  console.time(" merge palette");
  palette.sort((a, b) => {
    return b.population - a.population;
  });
  allPalette.push(...palette);
  // cie94色差で色削除
  for (let i = 0; i < palette.length; i++) {
    for (let ii = i + 1; ii < palette.length; ii++) {
      const cieDiff = getDiff(palette[i]!, palette[ii]!);
      if (cieDiff < 10) {
        palette[i]!.population += palette[ii]!.population;
        palette.splice(ii, 1);
        ii--;
      }
    }
  }
  if (palette.length >= 6) {
    const newMergedPalette: PetaColor[] = [];
    // 人口の多い色3つ。
    newMergedPalette.push(...palette.splice(0, 5));
    // 鮮やか順に
    palette.sort((a, b) => {
      return (Math.max(b.r, b.g, b.b) - Math.min(b.r, b.g, b.b)) - (Math.max(a.r, a.g, a.b) - Math.min(a.r, a.g, a.b));
    });
    newMergedPalette.push(...palette.splice(0, 3));
    newMergedPalette.sort((a, b) => {
      return b.population - a.population;
    });
    palette.length = 0;
    palette.push(...newMergedPalette);
  }
  console.timeEnd(" merge palette");
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
    allPalette: allPalette,
    placeholder: ""
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

function createPixels(buffer: Buffer, pixelCount: number) {
  const pixels: [number, number, number][] = [];
  for (let i = 0; i < pixelCount; i += 1) {
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
function getSubPalette(
  imageData: {
    buffer: Buffer,
    width: number,
    height: number, 
    sample: number,
    mergeCIEDiff: number,
    fixColorCIEDiff: number
  }
): PetaColor[] {
  const pixelCount = imageData.width * imageData.height;
  const pixels = createPixels(imageData.buffer, imageData.width * imageData.height);
  const qPalette = quantize(pixels, 64).palette();
  const colors = qPalette.map((color) => {
    return {
      r: color[0],
      g: color[1],
      b: color[2],
      population: 0
    }
  });
  for (let i = 0; i < colors.length; i++) {
    for (let ii = i + 1; ii < colors.length; ii++) {
      const cieDiff = getDiff(colors[i]!, colors[ii]!);
      if (cieDiff < imageData.mergeCIEDiff) {
        colors.splice(ii, 1);
        ii--;
      }
    }
  }
  let resolution = Math.floor(pixelCount / imageData.sample);
  if (resolution < 1) {
    resolution = 1;
  }
  colors.map((color) => {
    const similars: {[key: string]: { count: number, color: [number, number, number] }} = {};
    for (let i = 0; i < pixels.length; i += resolution) {
      const rc = pixels[i]!;
      const cieDiff = rgbDiff(
        rc,
        [color.r, color.g, color.b]
      );
      if (cieDiff < imageData.fixColorCIEDiff) {
        color.population++;
        const key = rc[0] + "," + rc[1] + "," + rc[2];
        if (similars[key] === undefined) {
          similars[key] = {
            count: 1,
            color: rc
          };
        } else {
          similars[key]!.count++;
        }
      }
    }
    const similar = Object.values(similars).sort((a, b) => {
      return b.count - a.count;
    })[0];
    if (similar !== undefined) {
      color.r = similar.color[0];
      color.g = similar.color[1];
      color.b = similar.color[2];
    }
  });
  return colors;
}
function getDiff(color1: PetaColor, color2: PetaColor) {
  return rgbDiff(
    [color1.r, color1.g, color1.b],
    [color2.r, color2.g, color2.b]
  );
}