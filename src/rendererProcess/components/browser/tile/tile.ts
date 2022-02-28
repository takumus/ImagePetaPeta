import { Vec2 } from "@/commons/utils/vec2";
import { PetaImage } from "@/commons/datas/petaImage";

export interface Tile {
  petaImage: PetaImage,
  position: Vec2
  width: number,
  height: number,
  visible: boolean
}