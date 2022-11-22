import { RPetaImage } from "@/commons/datas/rPetaImage";
import { Vec2 } from "@/commons/utils/vec2";

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
