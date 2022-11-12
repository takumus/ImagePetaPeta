export interface DecompressWorkerOutputData {
  imageData: ImageData;
  index: number;
  length: number;
  isLast: boolean;
  delay: number;
}
export interface DecompressWorkerInputData {
  buffer: ArrayBuffer;
  defaultDelay: number;
}
