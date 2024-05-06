import { MimeType } from "file-type";

import { PetaColor } from "@/commons/datas/petaColor";

interface _PetaFileMetadata {
  version: number;
  width: number;
  height: number;
  mimeType: MimeType | "unknown/unknown";
}
export interface PetaFileImageMetadata extends _PetaFileMetadata {
  type: "image";
  gif: boolean;
  palette: PetaColor[];
}
export interface PetaFileVideoMetadata extends _PetaFileMetadata {
  type: "video";
  duration: number;
  palette: PetaColor[];
}
export type PetaFileMetadata = PetaFileImageMetadata | PetaFileVideoMetadata;
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
  metadata: PetaFileMetadata;
  encrypted: boolean;
}
export type PetaFiles = { [id: string]: PetaFile };
