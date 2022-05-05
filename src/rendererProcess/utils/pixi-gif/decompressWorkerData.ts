import { ParsedFrame } from 'gifuct-js';
export interface DecompressWorkerData {
  parsedFrame: ParsedFrame,
  index: number,
  length: number,
  isLast: boolean,
}