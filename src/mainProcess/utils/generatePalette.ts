import { PetaColor } from "@/commons/datas/petaColor";
import { ciede } from "@/commons/utils/colors";
import quantize from "quantize";
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
    mergeCIEDiff: 15,
    fixColorCIEDiff: 8,
    ...imageData,
  });
  return palette;
}
export function getFullPalette(imageData: { buffer: Buffer; width: number; height: number }) {
  const palette = getPalette({
    sample: 10000,
    mergeCIEDiff: 5,
    fixColorCIEDiff: 4,
    ...imageData,
  });
  return palette;
}
export function getPalette(imageData: {
  buffer: Buffer;
  width: number;
  height: number;
  sample: number;
  mergeCIEDiff: number;
  fixColorCIEDiff: number;
}): PetaColor[] {
  const pixelCount = imageData.width * imageData.height;
  const pixels = createPixels(imageData.buffer, imageData.width * imageData.height);
  const qPalette = quantize(pixels, 256).palette();
  const colors = qPalette.map((color): PetaColor => {
    return {
      r: color[0],
      g: color[1],
      b: color[2],
      population: 0,
      positionSD: 0,
    };
  });
  for (let i = 0; i < colors.length; i++) {
    for (let ii = i + 1; ii < colors.length; ii++) {
      const cieDiff = ciede(colors[i]!, colors[ii]!);
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
    const similars: { [key: string]: { count: number; color: [number, number, number] } } = {};
    const positions: { x: number; y: number }[] = [];
    for (let i = 0; i < pixels.length; i += resolution) {
      const rc = pixels[i]!;
      const y = Math.floor(i / imageData.width);
      const x = i % imageData.width;
      const cieDiff = ciede(rc, [color.r, color.g, color.b]);
      if (cieDiff < imageData.fixColorCIEDiff) {
        color.population++;
        positions.push({ x, y });
        const key = rc[0] + "," + rc[1] + "," + rc[2];
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
    const similar = Object.values(similars).sort((a, b) => {
      return b.count - a.count;
    })[0];
    if (similar !== undefined) {
      color.r = similar.color[0];
      color.g = similar.color[1];
      color.b = similar.color[2];
      const avgPos = positions.reduce(
        (p, c) => {
          return {
            x: p.x + c.x,
            y: p.y + c.y,
          };
        },
        { x: 0, y: 0 },
      );
      avgPos.x /= color.population;
      avgPos.y /= color.population;
      const sdPos = positions.reduce(
        (p, c) => {
          return {
            x: p.x + Math.pow(c.x - avgPos.x, 2),
            y: p.y + Math.pow(c.y - avgPos.y, 2),
          };
        },
        { x: 0, y: 0 },
      );
      sdPos.x /= color.population;
      sdPos.y /= color.population;
      color.positionSD = Math.floor(sdPos.x + sdPos.y);
    }
  });
  return colors
    .filter((color) => {
      return color.population > 0;
    })
    .sort((a, b) => {
      return b.population - a.population;
    });
}
