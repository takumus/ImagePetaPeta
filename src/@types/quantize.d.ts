declare module "quantize" {
  export default function Quantize(
    colors: [number, number, number][],
    count: number,
  ): {
    palette: () => [number, number, number][];
  };
}
