// export interface generateGamutMapWorkerOutputData {
//   progress: number;
//   position: {
//     x: number;
//     y: number;
//   };
//   color: { r: number; g: number; b: number };
//   isLast: boolean;
// }
export type generateGamutMapWorkerOutputData = [
  number, // 0 progress
  boolean, // 1 isLast
  number, // 2 positionX
  number, // 3 positionY
  number, // 4 R
  number, // 5 G
  number, // 6 B,
  number, // 7 R2
  number, // 8 G2
  number, // 9 B2,
];
export interface generateGamutMapWorkerInputData {
  pixels: Uint8ClampedArray;
  resolution: number;
}
