import { PetaColor } from "@/commons/datas/petaColor";

export interface PetaImageMetadata {
  type: string;
  version: number;
}
export interface PetaImageImageMetadata extends PetaImageMetadata {
  type: "image";
  width: number;
  height: number;
  palette: PetaColor[];
}
export interface PetaImage {
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
  metadata: PetaImageImageMetadata;
}
export type PetaImages = { [id: string]: PetaImage };
