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
  const mainPalette = await new Vibrant(
    await sharp(resizedData)
    .ensureAlpha()
    .png()
    .toBuffer(),
    {
      quality: 1
    }
  ).getPalette();
  const raw = await sharp(resizedData)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
  const subPalette: any[] = getPalette(raw.data, raw.info.width, raw.info.height, 8, 1);
  const margedPalette = subPalette.map((color: any): PetaColor => {
    return {
      r: color[0],
      g: color[1],
      b: color[2],
      population: 1
    }
  });
  Object.values(mainPalette).map((s) => {
    const index = margedPalette.findIndex((mpc) => {
      return getDiff(swatchToPetaColor(s), mpc) < 15;
    });
    if (index >= 0) {
      margedPalette.splice(index, 1);
    }
  });
  margedPalette.unshift(...Object.values(mainPalette).map((s) => swatchToPetaColor(s)));
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
    palette: margedPalette,
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

function createPixelArray(imgData: any, pixelCount: number, quality: number) {
  const pixels = imgData;
  const pixelArray = [];

  for (let i = 0, offset, r, g, b, a; i < pixelCount; i = i + quality) {
      offset = i * 4;
      r = pixels[offset + 0];
      g = pixels[offset + 1];
      b = pixels[offset + 2];
      a = pixels[offset + 3];

      // If pixel is mostly opaque and not white
      if (typeof a === 'undefined' || a >= 125) {
          if (!(r > 250 && g > 250 && b > 250)) {
              pixelArray.push([r, g, b]);
          }
      }
  }
  return pixelArray;
}
function getPalette(buffer: Buffer, width: number, height: number, colorCount = 10, quality = 10) {
  colorCount = Math.max(colorCount, 2);
  colorCount = Math.min(colorCount, 20);
  quality = Math.max(colorCount, 1);
  const pixelCount = width * height;
  const pixelArray = createPixelArray(buffer, pixelCount, quality);

  const cmap = quantize(pixelArray, colorCount);
  const palette = cmap? cmap.palette() : null;
  return palette;
}
function getDiff(color1: PetaColor, color2: PetaColor) {
  return rgbDiff(
    [color1.r, color1.g, color1.b],
    [color2.r, color2.g, color2.b]
  );
}