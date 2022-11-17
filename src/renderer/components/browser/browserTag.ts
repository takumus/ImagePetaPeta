import { RPetaTag } from "@/commons/datas/rPetaTag";

export interface BrowserTag {
  petaTag: RPetaTag;
  count: number;
  selected: boolean;
  readonly: boolean;
}
