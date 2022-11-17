import { PetaTag } from "@/commons/datas/petaTag";

export interface RPetaTag extends PetaTag {
  renderer: {
    selected: boolean;
  };
}
