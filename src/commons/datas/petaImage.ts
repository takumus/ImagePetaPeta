import { PetaColor } from "@/commons/datas/petaColor";
export interface PetaImage {
  file: {
    original: string;
    thumbnail: string;
  };
  name: string;
  fileDate: number;
  addDate: number;
  width: number;
  height: number;
  id: string;
  placeholder: string;
  palette: PetaColor[];
  note: string;
  nsfw: boolean;
  metadataVersion: number;
}
export type PetaImages = { [id: string]: PetaImage };
