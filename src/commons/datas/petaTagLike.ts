import { PetaTag } from "@/commons/datas/petaTag";

export type PetaTagLike =
  | { type: "id"; id: string }
  | { type: "name"; name: string }
  | { type: "petaTag"; petaTag: PetaTag };
