import { PetaFile } from "@/commons/datas/petaFile";

export interface RPetaFile extends PetaFile {
  renderer: {
    selected: boolean;
  };
}
