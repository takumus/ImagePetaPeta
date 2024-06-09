export type ImageInfoSaveState = "saving" | "saved" | "failed" | "none";
export type ImageInfo = {
  width: number;
  height: number;
  loaded: boolean;
  type: string;
  saveState: ImageInfoSaveState;
};
