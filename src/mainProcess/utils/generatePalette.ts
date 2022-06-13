import { PetaColor } from "@/commons/datas/petaColor";
import { rgbDiff, rgbToHsl } from "@vibrant/color/lib/converter";
import quantize from 'quantize';
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
export function getSimplePalette(
  imageData: {
    buffer: Buffer,
    width: number,
    height: number,
  }
) {
  const palette = getPalette({
    sample: 2000,
    mergeCIEDiff: 5,
    fixColorCIEDiff: 10,
    ...imageData
  });
  // allPalette.push(...palette);
  // cie94色差で色削除
  for (let i = 0; i < palette.length; i++) {
    for (let ii = i + 1; ii < palette.length; ii++) {
      const cieDiff = getDiff(palette[i]!, palette[ii]!);
      if (cieDiff < 15) {
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
  return palette;
}
export function getPalette(
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
      population: 0,
      positions: [] as { x: number, y: number }[],
      differences: [] as number[],
      positionSD: 0
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
      const y = Math.floor(i / imageData.width);
      const x = i % imageData.width;
      const cieDiff = rgbDiff(
        rc,
        [color.r, color.g, color.b]
      );
      if (cieDiff < imageData.fixColorCIEDiff) {
        color.population++;
        color.positions.push({ x, y });
        color.differences.push(cieDiff);
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
      const avgPos = color.positions.reduce((p, c) => {
        return {
          x: p.x + c.x,
          y: p.y + c.y
        };
      }, { x: 0, y: 0 });
      avgPos.x /= color.population;
      avgPos.y /= color.population;
      const sdPos = color.positions.reduce((p, c) => {
        return {
          x: p.x + Math.pow(c.x - avgPos.x, 2),
          y: p.y + Math.pow(c.y - avgPos.y, 2)
        };
      }, { x: 0, y: 0 });
      sdPos.x /= color.population;
      sdPos.y /= color.population;
      color.positionSD = Math.floor(sdPos.x + sdPos.y);
    }
  });
  return colors.filter((color) => {
    return color.population > 0;
  }).sort((a, b) => {
    return b.population - a.population;
  });
}
function getDiff(color1: PetaColor, color2: PetaColor) {
  return rgbDiff(
    [color1.r, color1.g, color1.b],
    [color2.r, color2.g, color2.b]
  );
}