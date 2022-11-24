import { PetaColor } from "@/commons/datas/petaColor";

export interface PetaFileMetadata {
  type: string;
  version: number;
}
export interface PetaFileImageMetadata extends PetaFileMetadata {
  type: "image";
  width: number;
  height: number;
  palette: PetaColor[];
}
export interface PetaFile {
  file: {
    original: string;
    thumbnail: string;
  };
  id: string;
  name: string;
  fileDate: number;
  addDate: number;
  note: string;
  nsfw: boolean;
  metadata: PetaFileImageMetadata;
}
export type PetaFiles = { [id: string]: PetaFile };
