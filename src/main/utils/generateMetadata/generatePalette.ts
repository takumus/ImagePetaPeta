import quantize from "quantize";

import { PetaColor } from "@/commons/datas/petaColor";
import { ciede } from "@/commons/utils/colors";

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
export function getSimplePalette(imageData: { buffer: Buffer; width: number; height: number }) {
  const palette = getPalette({
    sample: 1000,
    beforeMergeCIEDiff: 10,
    fixColorCIEDiff: 8,
    afterMergeCIEFiff: 15,
    ...imageData,
  });
  return palette;
}
export function getFullPalette(imageData: { buffer: Buffer; width: number; height: number }) {
  const palette = getPalette({
    sample: 10000,
    beforeMergeCIEDiff: 5,
    fixColorCIEDiff: 4,
    afterMergeCIEFiff: 4,
    ...imageData,
  });
  return palette;
}
export function getPalette(imageData: {
  buffer: Buffer;
  width: number;
  height: number;
  sample: number;
  beforeMergeCIEDiff: number;
  fixColorCIEDiff: number;
  afterMergeCIEFiff: number;
}): PetaColor[] {
  const pixelCount = imageData.width * imageData.height;
  const pixels = createPixels(imageData.buffer, imageData.width * imageData.height);
  const qPalette = quantize(pixels, 256).palette();
  const colors = qPalette.map(
    (color): PetaColor => ({
      r: color[0],
      g: color[1],
      b: color[2],
      population: 0,
      positionSD: 0,
    }),
  );
  for (let i = 0; i < colors.length; i++) {
    for (let ii = i + 1; ii < colors.length; ii++) {
      const cieDiff = ciede(colors[i], colors[ii]);
      if (cieDiff < imageData.beforeMergeCIEDiff) {
        colors.splice(ii, 1);
        ii--;
      }
    }
  }
  let resolution = Math.floor(pixelCount / imageData.sample);
  if (resolution < 1) {
    resolution = 1;
  }
  colors.forEach((color) => {
    const similars: { [key: string]: { count: number; color: [number, number, number] } } = {};
    for (let i = 0; i < pixels.length; i += resolution) {
      const rc = pixels[i]!;
      if (ciede(rc, color) < imageData.fixColorCIEDiff) {
        color.population++;
        const key = rc.join(",");
        if (similars[key] === undefined) {
          similars[key] = {
            count: 1,
            color: rc,
          };
        } else {
          similars[key]!.count++;
        }
      }
    }
    const similar = Object.values(similars).sort((a, b) => b.count - a.count)[0];
    if (similar !== undefined) {
      color.r = similar.color[0];
      color.g = similar.color[1];
      color.b = similar.color[2];
    }
  });
  const palette = colors
    .filter((color) => {
      return color.population > 0;
    })
    .sort((a, b) => {
      return b.population - a.population;
    });
  for (let i = 0; i < palette.length; i++) {
    for (let ii = i + 1; ii < palette.length; ii++) {
      const cieDiff = ciede(palette[i], palette[ii]);
      if (cieDiff < imageData.afterMergeCIEFiff) {
        palette[i]!.population += palette[ii]!.population;
        palette.splice(ii, 1);
        ii--;
      }
    }
  }
  return palette.sort((a, b) => {
    return b.population - a.population;
  });
}
