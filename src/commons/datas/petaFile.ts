import { MimeType } from "file-type";

import { PetaColor } from "@/commons/datas/petaColor";

interface _PetaFileMetadata {
  type: string;
  version: number;
}
export interface PetaFileImageMetadata extends _PetaFileMetadata {
  type: "image";
  gif: boolean;
  width: number;
  height: number;
  palette: PetaColor[];
}
export interface PetaFileVideoMetadata extends _PetaFileMetadata {
  type: "video";
  width: number;
  height: number;
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
  mimeType: MimeType | "unknown/unknown";
  metadata: PetaFileMetadata;
  encrypted: boolean;
}
export type PetaFiles = { [id: string]: PetaFile };
