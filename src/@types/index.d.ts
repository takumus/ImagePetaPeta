/* eslint-disable */
declare module "*.png" {
  const src: string;
  export default src;
}
declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<{}, {}, any>;
  export default component;
}
declare module "deepcopy" {
  export default function <T>(value: T): T;
}
declare module "quantize" {
  export default function Quantize(
    colors: [number, number, number][],
    count: number,
  ): {
    palette: () => [number, number, number][];
  };
}
declare module "@csstools/convert-colors" {
  export function rgb2ciede([number, number, number], [number, number, number]): number;
  export function rgb2hsl(r: number, g: number, b: number): [number, number, number];
  export function rgb2hsv(r: number, g: number, b: number): [number, number, number];
  export function rgb2hex(r: number, g: number, b: number): string;
}
