import { rgbDiff } from "@/rendererProcess/utils/colorUtils";
import { PetaColor } from "@/commons/datas/petaColor";
import { PetaImage } from "@/commons/datas/petaImage";
export function getSimilarityScore(hash1: string, hash2: string) {
  try {
    const cs1 = getColors(hash1);
    const cs2 = getColors(hash2);
    let diff1 = 0;
    // 色の類似
    cs1.forEach((c1, i) => {
      const c2 = cs2[i]!;
      diff1 += rgbDiff(c1, c2);
    });
    const sim1 = 1 - diff1 / (255 * 255 * 3 * cs1.length);
    const score = sim1;
    if (isNaN(score)) {
      return 0;
    }
    return score;
  } catch {
    return 0;
  }
}
export function getSimilarityScore2(palette1: PetaColor[], palette2: PetaColor[]) {
  try {
    // let diff2 = 0;
    // Object.keys(palette1).forEach((key, i) => {
    //   const p1 = palette1[key as keyof PetaImagePalette];
    //   const p2 = palette2[key as keyof PetaImagePalette];
    //   diff1 += getDiff(p1, p2) * (Math.abs(p1.population - p2.population));
    // });
    // diff1 += getDiff(palette1.lightVibrant, palette2.vibrant);
    // diff1 += getDiff(palette1.muted, palette2.muted);
    return -getDiff(palette1[0]!, palette2[0]!);
  } catch {
    return 0;
  }
}
function getDiff(color1: PetaColor, color2: PetaColor) {
  return rgbDiff([color1.r, color1.g, color1.b], [color2.r, color2.g, color2.b]);
}
// https://github.com/woltapp/blurhash
export function getColors(hash: string) {
  const sizeFlag = decode83(hash[0]!);
  const numY = Math.floor(sizeFlag / 9) + 1;
  const numX = (sizeFlag % 9) + 1;
  const quantisedMaximumValue = decode83(hash[1]!);
  const maximumValue = (quantisedMaximumValue + 1) / 166;
  const colors = new Array(numX * numY);
  for (let i = 0; i < colors.length; i++) {
    if (i === 0) {
      const value = decode83(hash.substring(2, 6));
      colors[i] = decodeDC(value);
    } else {
      const value = decode83(hash.substring(4 + i * 2, 6 + i * 2));
      colors[i] = decodeAC(value, maximumValue * 1);
    }
  }
  const width = 3;
  const height = 3;
  const colors2: [number, number, number][] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (let j = 0; j < numY; j++) {
        for (let i = 0; i < numX; i++) {
          const basis = Math.cos((Math.PI * x * i) / width) * Math.cos((Math.PI * y * j) / height);
          const color = colors[i + j * numX];
          r += color[0] * basis;
          g += color[1] * basis;
          b += color[2] * basis;
        }
      }
      colors2.push([linearTosRGB(r), linearTosRGB(g), linearTosRGB(b)]);
    }
  }
  return colors2;
}
function sRGBToLinear(value: number) {
  const v = value / 255;
  if (v <= 0.04045) {
    return v / 12.92;
  } else {
    return Math.pow((v + 0.055) / 1.055, 2.4);
  }
}
function linearTosRGB(value: number) {
  const v = Math.max(0, Math.min(1, value));
  if (v <= 0.0031308) {
    return Math.round(v * 12.92 * 255 + 0.5);
  } else {
    return Math.round((1.055 * Math.pow(v, 1 / 2.4) - 0.055) * 255 + 0.5);
  }
}
function sign(n: number) {
  return n < 0 ? -1 : 1;
}
function signPow(val: number, exp: number) {
  return sign(val) * Math.pow(Math.abs(val), exp);
}
function decodeDC(value: number) {
  const intR = value >> 16;
  const intG = (value >> 8) & 255;
  const intB = value & 255;
  return [sRGBToLinear(intR), sRGBToLinear(intG), sRGBToLinear(intB)];
}
function decodeAC(value: number, maximumValue: number) {
  const quantR = Math.floor(value / (19 * 19));
  const quantG = Math.floor(value / 19) % 19;
  const quantB = value % 19;
  const rgb = [
    signPow((quantR - 9) / 9, 2.0) * maximumValue,
    signPow((quantG - 9) / 9, 2.0) * maximumValue,
    signPow((quantB - 9) / 9, 2.0) * maximumValue,
  ];
  return rgb;
}
const digitCharacters = [
  "0",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
  "P",
  "Q",
  "R",
  "S",
  "T",
  "U",
  "V",
  "W",
  "X",
  "Y",
  "Z",
  "a",
  "b",
  "c",
  "d",
  "e",
  "f",
  "g",
  "h",
  "i",
  "j",
  "k",
  "l",
  "m",
  "n",
  "o",
  "p",
  "q",
  "r",
  "s",
  "t",
  "u",
  "v",
  "w",
  "x",
  "y",
  "z",
  "#",
  "$",
  "%",
  "*",
  "+",
  ",",
  "-",
  ".",
  ":",
  ";",
  "=",
  "?",
  "@",
  "[",
  "]",
  "^",
  "_",
  "{",
  "|",
  "}",
  "~",
];
function decode83(str: string) {
  let value = 0;
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    const digit = digitCharacters.indexOf(str[i]!);
    value = value * 83 + digit;
  }
  return value;
}
