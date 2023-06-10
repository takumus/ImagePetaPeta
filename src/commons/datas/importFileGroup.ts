export type ImportFileAdditionalData = {
  name?: string;
  note?: string;
};
export type ImportFileGroup = (
  | {
      type: "url";
      url: string;
      ua?: string;
      referrer?: string;
      additionalData?: ImportFileAdditionalData;
    }
  | { type: "buffer"; buffer: ArrayBuffer; additionalData?: ImportFileAdditionalData }
  | { type: "filePath"; filePath: string; additionalData?: ImportFileAdditionalData }
)[];
