export type ImportFileGroup = (
  | { type: "url"; url: string; referrer?: string }
  | { type: "buffer"; buffer: ArrayBuffer }
  | { type: "filePath"; filePath: string }
)[];
