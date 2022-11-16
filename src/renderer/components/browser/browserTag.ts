import { PetaTag } from "@/commons/datas/petaTag";

export interface BrowserTag {
  petaTag: PetaTag;
  count: number;
  selected: boolean;
  readonly: boolean;
}
