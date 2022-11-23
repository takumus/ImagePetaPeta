import { RPetaImage } from "@/commons/datas/rPetaImage";
import { Vec2 } from "@/commons/utils/vec2";

export interface PropertyThumbnail {
  petaImage: RPetaImage;
  position: Vec2;
  width: number;
  height: number;
}
