import { RPetaFile } from "@/commons/datas/rPetaFile";
import { Vec2 } from "@/commons/utils/vec2";

export interface PropertyThumbnail {
  petaFile: RPetaFile;
  position: Vec2;
  width: number;
  height: number;
}
