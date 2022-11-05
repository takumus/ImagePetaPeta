import colorDiff from "color-diff";
import * as convert from "color-convert";
function _ciede(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  return colorDiff.diff(getLab(r1, g1, b1), getLab(r2, g2, b2));
}
const getLab = (() => {
  const labCache: { [key: string | number]: colorDiff.LabColor } = {};
  return (r: number, g: number, b: number) => {
    const key = (r << 16) | (g << 8) | b;
    return (
      labCache[key] ??
      (labCache[key] = colorDiff.rgb_to_lab({
        R: r,
        G: g,
        B: b,
      }))
    );
  };
})();
export function ciede(color1?: Color, color2?: Color) {
  if (color1 === undefined || color2 === undefined) {
    return 200;
  }
  return _ciede(...toArrayColor(color1), ...toArrayColor(color2));
}
export function rgb2hsl(color: Color) {
  return convert.rgb.hsl(...toArrayColor(color));
}
export function rgb2hsv(color: Color) {
  return convert.rgb.hsv(...toArrayColor(color));
}
export function rgb2hex(color: Color) {
  return convert.rgb.hex(...toArrayColor(color));
}
export function hex2rgb(hex: string): ObjectColor {
  const col = convert.hex.rgb(hex);
  return {
    r: col[0],
    g: col[1],
    b: col[2],
  };
}
function toArrayColor(color: Color) {
  return color instanceof Array ? color : ([color.r, color.g, color.b] as ArrayColor);
}
type ArrayColor = [number, number, number];
type ObjectColor = { r: number; g: number; b: number };
type Color = ArrayColor | ObjectColor;
