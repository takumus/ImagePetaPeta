import { PetaTag } from "@/commons/datas/petaTag";
interface Base {
  type: string;
}
interface ById extends Base {
  type: "id";
  id: string;
}
interface ByName extends Base {
  type: "name";
  name: string;
}
interface ByPetaTag extends Base {
  type: "petaTag";
  petaTag: PetaTag;
}
export type PetaTagLike = ById | ByName | ByPetaTag;
