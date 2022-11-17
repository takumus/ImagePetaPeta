import { Vec2 } from "@/commons/utils/vec2";
import { RPetaImage } from "@/commons/datas/rPetaImage";

export interface PropertyThumbnail {
  petaImage: RPetaImage;
  position: Vec2;
  width: number;
  height: number;
}
