import { PetaImage } from "@/commons/datas/petaImage";
export interface RPetaImage extends PetaImage {
  renderer: {
    selected: boolean;
  };
}
