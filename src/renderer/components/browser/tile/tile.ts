import { Vec2 } from "@/commons/utils/vec2";
import { RPetaImage } from "@/commons/datas/rPetaImage";

export interface Tile {
  petaImage?: RPetaImage;
  position: Vec2;
  width: number;
  height: number;
  visible: boolean;
  preVisible: boolean;
  group?: string;
  id: string;
}
